-- Resumo financeiro por valores em comissoes (status da comissao):
-- total_acumulado = soma de todos os valores (todos os status)
-- total_pendente  = soma onde status = pendente
-- total_pago      = soma onde status = pago
--
-- DROP obrigatorio: versões anteriores podem ter DEFAULT NULL no parametro;
-- CREATE OR REPLACE nao permite remover defaults (42P13).

DROP FUNCTION IF EXISTS public.get_comissoes_summary(bigint);

CREATE FUNCTION public.get_comissoes_summary(p_usuario_id bigint)
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
  )
  SELECT
    coalesce(SUM(c.valor), 0)::numeric AS total_acumulado,
    coalesce(SUM(c.valor) FILTER (WHERE c.status = 'pendente'), 0)::numeric AS total_pendente,
    coalesce(SUM(c.valor) FILTER (WHERE c.status = 'pago'), 0)::numeric AS total_pago
  FROM public.comissoes c
  JOIN ctx ON ctx.usuario_id = c.usuario_id;
$$;

COMMENT ON FUNCTION public.get_comissoes_summary(bigint) IS
  'Resumo por comissoes: acumulado=soma de todos os valores; pendente=status pendente; pago=status pago. p_usuario_id NULL = usuario autenticado.';

GRANT EXECUTE ON FUNCTION public.get_comissoes_summary(bigint) TO authenticated;
