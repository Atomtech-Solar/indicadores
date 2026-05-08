-- Aba Analytics no dashboard admin: RPC agregada + índices auxiliares.
-- Reaproveita dados existentes (indicacoes, comissoes, usuarios) sem novas colunas.
--
-- Convenções (compatíveis com get_admin_overview):
--   * faturamento  = SUM(indicacoes.valor_projeto) WHERE status='fechado',
--                    bucket por updated_at (estimativa de fechamento).
--   * comissões pagas = SUM(comissoes.valor) WHERE status='pago',
--                       bucket por COALESCE(data_pagamento, updated_at, created_at).
--   * tempoMedioFechamentoDias = AVG(updated_at - created_at) das fechadas no período.
--     OBS: aproximação — updated_at reflete a última edição, não o exato momento
--     da transição para 'fechado'. Frontend deve rotular como estimativa.

-- ---------------------------------------------------------------------------
-- 1) Índices auxiliares
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_indicacoes_status_created_at
  ON public.indicacoes (status, created_at);

CREATE INDEX IF NOT EXISTS idx_indicacoes_status_updated_at
  ON public.indicacoes (status, updated_at);

CREATE INDEX IF NOT EXISTS idx_comissoes_status_created_at
  ON public.comissoes (status, created_at);

-- ---------------------------------------------------------------------------
-- 2) RPC get_admin_analytics(p_period text)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_admin_analytics(text);

CREATE FUNCTION public.get_admin_analytics(p_period text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period text;
  v_start  timestamptz;
  v_now    timestamptz := now();
  result   jsonb;
BEGIN
  -- Aceita chamada via service_role (Edge admin-ops, que já valida admin
  -- com o JWT do usuário) OU chamada direta de um admin autenticado.
  IF NOT (public._is_admin_request() OR public.is_admin()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_period := lower(coalesce(p_period, '30d'));
  IF v_period NOT IN ('7d', '30d', '90d', '12m', 'all') THEN
    v_period := '30d';
  END IF;

  v_start := CASE v_period
    WHEN '7d'  THEN v_now - interval '7 days'
    WHEN '30d' THEN v_now - interval '30 days'
    WHEN '90d' THEN v_now - interval '90 days'
    WHEN '12m' THEN v_now - interval '12 months'
    WHEN 'all' THEN '1970-01-01'::timestamptz
  END;

  WITH
  -- Indicações criadas no período (escopo principal de funil/mix/contagens)
  ind_period AS (
    SELECT
      i.id,
      i.usuario_id,
      i.status,
      i.tipo,
      i.tipo_projeto,
      i.valor_potencial,
      i.valor_projeto,
      i.created_at,
      i.updated_at
    FROM public.indicacoes i
    WHERE i.created_at >= v_start
  ),
  ind_kpis AS (
    SELECT
      COUNT(*)::bigint                                        AS total,
      COUNT(*) FILTER (WHERE status = 'fechado')::bigint      AS fechadas,
      COUNT(*) FILTER (WHERE status = 'perdido')::bigint      AS perdidas
    FROM ind_period
  ),
  -- Indicações fechadas no período (bucket por updated_at = aproximação de fechamento)
  closed_period AS (
    SELECT i.valor_projeto, i.created_at, i.updated_at
    FROM public.indicacoes i
    WHERE i.status = 'fechado'
      AND i.updated_at >= v_start
      AND i.valor_projeto IS NOT NULL
  ),
  closed_kpis AS (
    SELECT
      COALESCE(SUM(valor_projeto), 0)::numeric                                          AS faturamento,
      COALESCE(AVG(valor_projeto), 0)::numeric                                          AS ticket_medio,
      COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400.0), 0)::numeric AS tempo_medio_fechamento
    FROM closed_period
  ),
  -- Comissões pagas no período
  comissoes_pagas_kpi AS (
    SELECT COALESCE(SUM(c.valor), 0)::numeric AS total
    FROM public.comissoes c
    WHERE c.status = 'pago'
      AND COALESCE(c.data_pagamento, c.updated_at, c.created_at) >= v_start
  ),
  -- Pipeline em aberto: snapshot atual, NÃO depende do período
  pipeline AS (
    SELECT COALESCE(SUM(i.valor_potencial), 0)::numeric AS aberto
    FROM public.indicacoes i
    WHERE i.status IN ('enviado', 'analise', 'negociacao')
  ),
  -- Funil por status (período)
  funnel AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'enviado')::bigint    AS enviado,
      COUNT(*) FILTER (WHERE status = 'analise')::bigint    AS analise,
      COUNT(*) FILTER (WHERE status = 'negociacao')::bigint AS negociacao,
      COUNT(*) FILTER (WHERE status = 'fechado')::bigint    AS fechado,
      COUNT(*) FILTER (WHERE status = 'perdido')::bigint    AS perdido
    FROM ind_period
  ),
  -- Série de receita: fixa em 12 meses encerrando no mês corrente
  months AS (
    SELECT generate_series(
      date_trunc('month', v_now) - interval '11 months',
      date_trunc('month', v_now),
      interval '1 month'
    ) AS m
  ),
  revenue_series AS (
    SELECT
      m.m,
      to_char(m.m, 'YYYY-MM') AS month_iso,
      CASE EXTRACT(MONTH FROM m.m)::int
        WHEN 1  THEN 'jan' WHEN 2  THEN 'fev' WHEN 3  THEN 'mar'
        WHEN 4  THEN 'abr' WHEN 5  THEN 'mai' WHEN 6  THEN 'jun'
        WHEN 7  THEN 'jul' WHEN 8  THEN 'ago' WHEN 9  THEN 'set'
        WHEN 10 THEN 'out' WHEN 11 THEN 'nov' WHEN 12 THEN 'dez'
      END AS label,
      COALESCE((
        SELECT SUM(i.valor_projeto)::numeric
        FROM public.indicacoes i
        WHERE i.status = 'fechado'
          AND i.valor_projeto IS NOT NULL
          AND i.updated_at >= m.m
          AND i.updated_at <  m.m + interval '1 month'
      ), 0)::numeric AS faturamento,
      COALESCE((
        SELECT SUM(c.valor)::numeric
        FROM public.comissoes c
        WHERE c.status = 'pago'
          AND COALESCE(c.data_pagamento, c.updated_at, c.created_at) >= m.m
          AND COALESCE(c.data_pagamento, c.updated_at, c.created_at) <  m.m + interval '1 month'
      ), 0)::numeric AS comissoes_pagas,
      COALESCE((
        SELECT COUNT(*)::bigint
        FROM public.indicacoes i
        WHERE i.status = 'fechado'
          AND i.updated_at >= m.m
          AND i.updated_at <  m.m + interval '1 month'
      ), 0)::bigint AS fechadas
    FROM months m
  ),
  -- Ranking de indicadores (período)
  ranking_base AS (
    SELECT u.id, u.nome
    FROM public.usuarios u
    WHERE u.role = 'indicador'
  ),
  ranking_raw AS (
    SELECT
      r.id   AS usuario_id,
      r.nome,
      COALESCE((
        SELECT COUNT(*)::bigint
        FROM public.indicacoes i
        WHERE i.usuario_id = r.id
          AND i.created_at >= v_start
      ), 0) AS total_indicacoes,
      COALESCE((
        SELECT COUNT(*)::bigint
        FROM public.indicacoes i
        WHERE i.usuario_id = r.id
          AND i.status = 'fechado'
          AND i.created_at >= v_start
      ), 0) AS total_fechadas,
      COALESCE((
        SELECT SUM(c.valor)::numeric
        FROM public.comissoes c
        WHERE c.usuario_id = r.id
          AND c.status = 'pago'
          AND COALESCE(c.data_pagamento, c.updated_at, c.created_at) >= v_start
      ), 0) AS receita_comissao,
      COALESCE((
        SELECT SUM(i.valor_projeto)::numeric
        FROM public.indicacoes i
        WHERE i.usuario_id = r.id
          AND i.status = 'fechado'
          AND i.valor_projeto IS NOT NULL
          AND i.updated_at >= v_start
      ), 0) AS faturamento_gerado
    FROM ranking_base r
  ),
  ranking_top AS (
    SELECT
      usuario_id,
      nome,
      total_indicacoes,
      total_fechadas,
      receita_comissao,
      faturamento_gerado,
      CASE
        WHEN total_indicacoes > 0
          THEN ROUND((total_fechadas::numeric / total_indicacoes::numeric) * 100, 1)
        ELSE 0
      END AS conversao
    FROM ranking_raw
    ORDER BY receita_comissao DESC, faturamento_gerado DESC, total_fechadas DESC
    LIMIT 10
  ),
  -- Mix por tipo (PF/PJ) — período
  mix_tipo AS (
    SELECT
      COUNT(*) FILTER (WHERE tipo = 'pessoa')::bigint  AS pessoa,
      COUNT(*) FILTER (WHERE tipo = 'empresa')::bigint AS empresa
    FROM ind_period
  ),
  -- Mix por tipo_projeto (CSV) — período
  mix_projeto_raw AS (
    SELECT trim(t) AS tp
    FROM ind_period i
    CROSS JOIN LATERAL unnest(string_to_array(coalesce(i.tipo_projeto, ''), ',')) AS t
    WHERE trim(t) <> ''
  ),
  mix_projeto AS (
    SELECT
      COUNT(*) FILTER (WHERE tp = 'usina_solar')::bigint                                       AS usina_solar,
      COUNT(*) FILTER (WHERE tp = 'carregador_veicular')::bigint                               AS carregador_veicular,
      COUNT(*) FILTER (WHERE tp NOT IN ('usina_solar', 'carregador_veicular'))::bigint         AS outros
    FROM mix_projeto_raw
  )
  SELECT jsonb_build_object(
    'period', v_period,
    'kpis', jsonb_build_object(
      'totalIndicacoes',          (SELECT total    FROM ind_kpis),
      'totalFechadas',            (SELECT fechadas FROM ind_kpis),
      'totalPerdidas',            (SELECT perdidas FROM ind_kpis),
      'conversionRate',
        CASE WHEN (SELECT total FROM ind_kpis) > 0
          THEN ROUND(((SELECT fechadas FROM ind_kpis)::numeric
                      / (SELECT total FROM ind_kpis)::numeric) * 100, 1)
          ELSE 0 END,
      'lossRate',
        CASE WHEN (SELECT total FROM ind_kpis) > 0
          THEN ROUND(((SELECT perdidas FROM ind_kpis)::numeric
                      / (SELECT total FROM ind_kpis)::numeric) * 100, 1)
          ELSE 0 END,
      'ticketMedio',              (SELECT ticket_medio    FROM closed_kpis),
      'faturamento',              (SELECT faturamento     FROM closed_kpis),
      'comissoesPagas',           (SELECT total           FROM comissoes_pagas_kpi),
      'pipelineAberto',           (SELECT aberto          FROM pipeline),
      'tempoMedioFechamentoDias', ROUND((SELECT tempo_medio_fechamento FROM closed_kpis), 1)
    ),
    'funnel', (SELECT to_jsonb(f) FROM funnel f),
    'revenueSeries', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'month',          month_iso,
          'label',          label,
          'faturamento',    faturamento,
          'comissoesPagas', comissoes_pagas,
          'fechadas',       fechadas
        ) ORDER BY m
      )
      FROM revenue_series
    ), '[]'::jsonb),
    'ranking', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'usuario_id',         usuario_id,
          'nome',               nome,
          'totalIndicacoes',    total_indicacoes,
          'totalFechadas',      total_fechadas,
          'conversao',          conversao,
          'receitaComissao',    receita_comissao,
          'faturamentoGerado',  faturamento_gerado
        )
      )
      FROM ranking_top
    ), '[]'::jsonb),
    'mix', jsonb_build_object(
      'porTipo', jsonb_build_object(
        'pessoa',  (SELECT pessoa  FROM mix_tipo),
        'empresa', (SELECT empresa FROM mix_tipo)
      ),
      'porTipoProjeto', jsonb_build_object(
        'usina_solar',         (SELECT usina_solar         FROM mix_projeto),
        'carregador_veicular', (SELECT carregador_veicular FROM mix_projeto),
        'outros',              (SELECT outros              FROM mix_projeto)
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_admin_analytics(text) IS
  'Aba Analytics admin: agrega KPIs, funil, série mensal (12m fixos), ranking top 10 e mix de tipos para o período (7d|30d|90d|12m|all). Cálculo 100% no banco; tempo médio de fechamento é estimativa baseada em updated_at.';

REVOKE ALL ON FUNCTION public.get_admin_analytics(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics(text) TO authenticated;
