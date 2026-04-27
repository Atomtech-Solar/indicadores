-- Remove ambiguidade: get_comissoes_summary() vs get_comissoes_summary(bigint DEFAULT NULL)
-- Padroniza assinatura sem DEFAULT; remove status inexistente em comissoes ('concluido').
-- Opcional: mesma correção para get_comissoes_filtradas (text,text) vs (text,text,bigint DEFAULT).

-- ---------------------------------------------------------------------------
-- get_comissoes_summary
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_comissoes_summary();

CREATE OR REPLACE FUNCTION public.get_comissoes_summary(p_usuario_id bigint)
RETURNS TABLE (
  total_acumulado numeric,
  total_pendente numeric,
  total_pago numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH ctx AS (
    SELECT public._resolve_usuario_id_secure(p_usuario_id) AS usuario_id
  ),
  base AS (
    SELECT
      i.id AS indicacao_id,
      i.status AS indicacao_status,
      i.valor_potencial,
      c.status AS comissao_status,
      c.valor AS comissao_valor
    FROM public.indicacoes i
    LEFT JOIN public.comissoes c ON c.indicacao_id = i.id
    JOIN ctx ON ctx.usuario_id = i.usuario_id
  )
  SELECT
    coalesce(
      SUM(
        CASE
          WHEN indicacao_status = 'negociacao'
            THEN coalesce(valor_potencial, 0)
          ELSE 0
        END
      ),
      0
    )::numeric AS total_acumulado,
    coalesce(
      SUM(
        CASE
          WHEN indicacao_status = 'fechado'
            THEN coalesce(valor_potencial, 0)
          ELSE 0
        END
      ),
      0
    )::numeric AS total_pendente,
    coalesce(
      SUM(
        CASE
          WHEN comissao_status = 'pago' THEN coalesce(comissao_valor, 0)
          ELSE 0
        END
      ),
      0
    )::numeric AS total_pago
  FROM base;
$$;

COMMENT ON FUNCTION public.get_comissoes_summary(bigint) IS
  'Resumo financeiro: acumulado=indicacoes em negociacao (valor_potencial); pendente=fechado; pago=somente comissoes.status pago. p_usuario_id NULL = usuario autenticado; override apenas service_role.';

GRANT EXECUTE ON FUNCTION public.get_comissoes_summary(bigint) TO authenticated;

-- ---------------------------------------------------------------------------
-- get_comissoes_filtradas (remove sobrecarga de 2 argumentos)
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_comissoes_filtradas(text, text);

CREATE OR REPLACE FUNCTION public.get_comissoes_filtradas(
  p_period text,
  p_status text,
  p_usuario_id bigint
)
RETURNS TABLE (
  id bigint,
  valor numeric,
  status text,
  created_at timestamptz,
  nome_indicado text
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_usuario_id bigint;
  v_status text := lower(trim(p_status));
  v_period text := lower(trim(p_period));
  v_start timestamptz;
BEGIN
  v_usuario_id := public._resolve_usuario_id_secure(p_usuario_id);

  IF v_period = '7d' THEN
    v_start := now() - interval '7 days';
  ELSIF v_period = '30d' THEN
    v_start := now() - interval '30 days';
  ELSIF v_period = '90d' THEN
    v_start := now() - interval '90 days';
  ELSE
    RAISE EXCEPTION 'invalid_period: %, allowed: 7d|30d|90d', p_period;
  END IF;

  IF v_status NOT IN ('all', 'pendente', 'pago', 'disponivel', 'cancelado') THEN
    RAISE EXCEPTION 'invalid_status: %, allowed: all|pendente|pago|disponivel|cancelado', p_status;
  END IF;

  RETURN QUERY
  SELECT
    v.id,
    v.valor,
    v.status,
    v.created_at,
    v.nome_indicado
  FROM public.vw_comissoes_dashboard v
  JOIN public.comissoes c ON c.id = v.id
  WHERE c.usuario_id = v_usuario_id
    AND v.created_at >= v_start
    AND (v_status = 'all' OR v.status = v_status)
  ORDER BY v.created_at DESC;
END;
$$;

COMMENT ON FUNCTION public.get_comissoes_filtradas(text, text, bigint) IS
  'Lista comissoes filtradas por periodo/status. p_usuario_id NULL = usuario autenticado; override apenas service_role.';

GRANT EXECUTE ON FUNCTION public.get_comissoes_filtradas(text, text, bigint) TO authenticated;
