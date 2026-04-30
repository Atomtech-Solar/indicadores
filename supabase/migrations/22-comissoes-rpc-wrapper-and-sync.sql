-- Wrappers estáveis para chamadas do indicador sem p_usuario_id explícito

CREATE OR REPLACE FUNCTION public.get_comissoes_summary()
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
  SELECT * FROM public.get_comissoes_summary(NULL::bigint);
$$;

GRANT EXECUTE ON FUNCTION public.get_comissoes_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_comissoes_filtradas(
  p_period text,
  p_status text
)
RETURNS TABLE (
  id bigint,
  valor numeric,
  status text,
  created_at timestamptz,
  nome_indicado text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM public.get_comissoes_filtradas(p_period, p_status, NULL::bigint);
$$;

GRANT EXECUTE ON FUNCTION public.get_comissoes_filtradas(text, text) TO authenticated;
