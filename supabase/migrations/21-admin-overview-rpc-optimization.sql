-- Otimizacao: agrega overview admin no banco (sem full-scan na Edge Function)

DROP FUNCTION IF EXISTS public.get_admin_overview();

CREATE FUNCTION public.get_admin_overview()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
WITH now_ctx AS (
  SELECT
    now() AS now_ts,
    date_trunc('month', now()) AS current_month,
    date_trunc('month', now()) - interval '5 months' AS growth_start,
    now() - interval '7 days' AS seven_days_ago
),
metrics AS (
  SELECT
    COALESCE(SUM(i.valor_projeto) FILTER (WHERE i.status = 'fechado'), 0)::numeric AS total_faturamento,
    COALESCE(
      SUM(i.valor_projeto) FILTER (
        WHERE i.status = 'fechado'
          AND i.updated_at >= n.current_month
          AND i.updated_at < n.current_month + interval '1 month'
      ),
      0
    )::numeric AS faturamento_mes,
    COUNT(*)::bigint AS total_indicacoes
  FROM public.indicacoes i
  CROSS JOIN now_ctx n
),
comissoes_stats AS (
  SELECT
    COALESCE(SUM(c.valor) FILTER (WHERE c.status = 'pago'), 0)::numeric AS total_comissoes_pagas
  FROM public.comissoes c
),
indicadores_stats AS (
  SELECT COUNT(*)::bigint AS total_indicadores
  FROM public.usuarios u
  WHERE u.role = 'indicador'
),
funnel AS (
  SELECT
    COUNT(*) FILTER (WHERE i.status = 'enviado')::bigint AS enviado,
    COUNT(*) FILTER (WHERE i.status = 'analise')::bigint AS analise,
    COUNT(*) FILTER (WHERE i.status = 'negociacao')::bigint AS negociacao,
    COUNT(*) FILTER (WHERE i.status = 'fechado')::bigint AS fechado,
    COUNT(*) FILTER (WHERE i.status = 'perdido')::bigint AS perdido
  FROM public.indicacoes i
),
growth_months AS (
  SELECT generate_series(n.growth_start, n.current_month, interval '1 month') AS month_start
  FROM now_ctx n
),
growth_series AS (
  SELECT
    gm.month_start,
    CASE EXTRACT(MONTH FROM gm.month_start)::int
      WHEN 1 THEN 'jan'
      WHEN 2 THEN 'fev'
      WHEN 3 THEN 'mar'
      WHEN 4 THEN 'abr'
      WHEN 5 THEN 'mai'
      WHEN 6 THEN 'jun'
      WHEN 7 THEN 'jul'
      WHEN 8 THEN 'ago'
      WHEN 9 THEN 'set'
      WHEN 10 THEN 'out'
      WHEN 11 THEN 'nov'
      WHEN 12 THEN 'dez'
    END AS label,
    COALESCE((
      SELECT SUM(i.valor_projeto)::numeric
      FROM public.indicacoes i
      WHERE i.status = 'fechado'
        AND i.updated_at >= gm.month_start
        AND i.updated_at < gm.month_start + interval '1 month'
    ), 0)::numeric AS faturamento,
    COALESCE((
      SELECT SUM(c.valor)::numeric
      FROM public.comissoes c
      WHERE c.status = 'pago'
        AND COALESCE(c.data_pagamento, c.updated_at, c.created_at) >= gm.month_start
        AND COALESCE(c.data_pagamento, c.updated_at, c.created_at) < gm.month_start + interval '1 month'
    ), 0)::numeric AS comissoes_pagas
  FROM growth_months gm
  ORDER BY gm.month_start
),
comissoes_pagas_lista AS (
  SELECT
    c.id,
    COALESCE(u.nome, 'Usuário') AS usuario_nome,
    COALESCE(i.nome_indicado, 'Indicação #' || c.indicacao_id::text) AS indicacao_nome,
    c.valor::numeric AS valor,
    COALESCE(c.data_pagamento, c.updated_at, c.created_at) AS data_pagamento
  FROM public.comissoes c
  LEFT JOIN public.usuarios u ON u.id = c.usuario_id
  LEFT JOIN public.indicacoes i ON i.id = c.indicacao_id
  WHERE c.status = 'pago'
  ORDER BY COALESCE(c.data_pagamento, c.updated_at, c.created_at) DESC
  LIMIT 50
),
fechados_recente AS (
  SELECT COUNT(*)::bigint AS fechados_ultimos_7
  FROM public.indicacoes i
  CROSS JOIN now_ctx n
  WHERE i.status = 'fechado' AND i.updated_at >= n.seven_days_ago
),
alerts_raw AS (
  SELECT ARRAY_REMOVE(ARRAY[
    CASE WHEN (SELECT fechados_ultimos_7 FROM fechados_recente) = 0
      THEN '⚠️ Nenhuma venda fechada recentemente' END,
    CASE WHEN (SELECT analise FROM funnel) >= 5
      THEN '⚠️ ' || (SELECT analise FROM funnel)::text || ' indicações aguardando análise' END,
    CASE
      WHEN (
        SELECT gs_last.faturamento > gs_prev.faturamento AND gs_last.faturamento > 0
        FROM (SELECT * FROM growth_series ORDER BY month_start DESC LIMIT 1) gs_last,
             (SELECT * FROM growth_series ORDER BY month_start DESC OFFSET 1 LIMIT 1) gs_prev
      )
      THEN '📈 Faturamento em crescimento este mês'
    END
  ], NULL) AS alerts
),
alerts AS (
  SELECT
    CASE
      WHEN COALESCE(array_length(ar.alerts, 1), 0) = 0
        THEN ARRAY['Operação estável no momento.']::text[]
      ELSE ar.alerts
    END AS alerts
  FROM alerts_raw ar
)
SELECT jsonb_build_object(
  'metrics', jsonb_build_object(
    'totalFaturamento', (SELECT total_faturamento FROM metrics),
    'faturamentoMes', (SELECT faturamento_mes FROM metrics),
    'totalComissoesPagas', (SELECT total_comissoes_pagas FROM comissoes_stats),
    'totalIndicacoes', (SELECT total_indicacoes FROM metrics),
    'totalIndicadores', (SELECT total_indicadores FROM indicadores_stats)
  ),
  'comissoesPagasLista', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', cpl.id,
      'usuario_nome', cpl.usuario_nome,
      'indicacao_nome', cpl.indicacao_nome,
      'valor', cpl.valor,
      'data_pagamento', cpl.data_pagamento
    ))
    FROM comissoes_pagas_lista cpl
  ), '[]'::jsonb),
  'growthSeries', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'label', gs.label,
      'faturamento', gs.faturamento,
      'comissoesPagas', gs.comissoes_pagas
    ) ORDER BY gs.month_start)
    FROM growth_series gs
  ), '[]'::jsonb),
  'funnel', jsonb_build_object(
    'enviado', (SELECT enviado FROM funnel),
    'analise', (SELECT analise FROM funnel),
    'negociacao', (SELECT negociacao FROM funnel),
    'fechado', (SELECT fechado FROM funnel),
    'perdido', (SELECT perdido FROM funnel)
  ),
  'alerts', to_jsonb((SELECT a.alerts FROM alerts a))
);
$$;

COMMENT ON FUNCTION public.get_admin_overview() IS
  'Retorna métricas agregadas do dashboard admin com cálculo 100% no banco.';

GRANT EXECUTE ON FUNCTION public.get_admin_overview() TO authenticated;
