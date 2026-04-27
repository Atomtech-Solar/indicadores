-- RPCs e view para aba "Indicacoes" com logica no banco.

-- ---------------------------------------------------------------------------
-- Helpers internos (preparo para modo admin futuro com p_usuario_id bigint)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._resolve_usuario_id(p_usuario_id bigint DEFAULT NULL)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_usuario_id bigint;
BEGIN
  IF p_usuario_id IS NOT NULL THEN
    RETURN p_usuario_id;
  END IF;

  v_usuario_id := public.get_my_usuario_id();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'usuario_id_not_found_for_authenticated_user';
  END IF;

  RETURN v_usuario_id;
END;
$$;

CREATE OR REPLACE FUNCTION public._period_start(p_period text)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  CASE lower(trim(p_period))
    WHEN 'today' THEN
      RETURN date_trunc('day', v_now);
    WHEN 'week' THEN
      RETURN v_now - interval '7 days';
    WHEN 'month' THEN
      RETURN date_trunc('month', v_now);
    ELSE
      RAISE EXCEPTION 'invalid_period: %, allowed: today|week|month', p_period;
  END CASE;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1) FUNIL DE INDICACOES (RPC)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_indicacoes_funnel(period text)
RETURNS TABLE (
  enviado bigint,
  analise bigint,
  negociacao bigint,
  fechado bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH ctx AS (
    SELECT public._resolve_usuario_id(NULL) AS usuario_id,
           public._period_start(period) AS start_at
  )
  SELECT
    COUNT(*) FILTER (WHERE i.status = 'enviado')::bigint AS enviado,
    COUNT(*) FILTER (WHERE i.status = 'analise')::bigint AS analise,
    COUNT(*) FILTER (WHERE i.status = 'negociacao')::bigint AS negociacao,
    COUNT(*) FILTER (WHERE i.status = 'fechado')::bigint AS fechado
  FROM public.indicacoes i
  JOIN ctx ON ctx.usuario_id = i.usuario_id
  WHERE i.created_at >= ctx.start_at;
$$;

COMMENT ON FUNCTION public.get_indicacoes_funnel(text) IS
  'Retorna contagens de funil por status para o usuario autenticado e periodo (today|week|month).';

-- ---------------------------------------------------------------------------
-- 2) LISTA DE INDICACOES POR PERIODO (RPC)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_indicacoes_by_period(period text)
RETURNS TABLE (
  id bigint,
  nome_indicado text,
  tipo text,
  status text,
  valor_potencial numeric,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH ctx AS (
    SELECT public._resolve_usuario_id(NULL) AS usuario_id,
           public._period_start(period) AS start_at
  )
  SELECT
    i.id,
    i.nome_indicado,
    i.tipo,
    i.status,
    i.valor_potencial,
    i.created_at
  FROM public.indicacoes i
  JOIN ctx ON ctx.usuario_id = i.usuario_id
  WHERE i.created_at >= ctx.start_at
  ORDER BY i.created_at DESC;
$$;

COMMENT ON FUNCTION public.get_indicacoes_by_period(text) IS
  'Retorna indicacoes do usuario autenticado filtradas por periodo (today|week|month).';

GRANT EXECUTE ON FUNCTION public.get_indicacoes_funnel(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_indicacoes_by_period(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) VIEW PARA DASHBOARD
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_indicacoes_dashboard
WITH (security_invoker = true)
AS
SELECT
  i.id,
  i.nome_indicado,
  i.tipo,
  i.status,
  i.valor_potencial,
  i.created_at
FROM public.indicacoes i;

COMMENT ON VIEW public.vw_indicacoes_dashboard IS
  'View base para dashboard de indicacoes (colunas enxutas, compativel com RLS da tabela origem).';

GRANT SELECT ON public.vw_indicacoes_dashboard TO authenticated;
