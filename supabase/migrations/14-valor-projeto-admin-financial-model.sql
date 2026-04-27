-- Modelo financeiro: coluna valor_projeto (faturamento) + RPC get_admin_dashboard_summary.
-- Ocultação de valor_projeto para o indicador: via view vw_indicacoes_dashboard (sem a coluna).

-- ---------------------------------------------------------------------------
-- 1) Coluna valor_projeto
-- ---------------------------------------------------------------------------
ALTER TABLE public.indicacoes
  ADD COLUMN IF NOT EXISTS valor_projeto numeric;

COMMENT ON COLUMN public.indicacoes.valor_projeto IS
  'Valor do projeto / receita da empresa quando o negócio é fechado. UI do indicador: não projetar em vw_indicacoes_dashboard.';

-- Nota: privilégio SELECT por coluna (ocultar valor_projeto) foi revertido na migration 15
-- por incompatibilidade com PostgREST/views no fluxo do indicador.

-- ---------------------------------------------------------------------------
-- 2) RPC resumo admin (SECURITY DEFINER + is_admin)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_summary()
RETURNS TABLE (
  total_faturamento numeric,
  faturamento_mes numeric,
  total_comissoes_pagas numeric,
  total_indicacoes bigint,
  total_indicadores bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    coalesce(
      (SELECT sum(i.valor_projeto)::numeric
       FROM public.indicacoes i
       WHERE i.status = 'fechado'
         AND i.valor_projeto IS NOT NULL),
      0
    ) AS total_faturamento,
    coalesce(
      (SELECT sum(i.valor_projeto)::numeric
       FROM public.indicacoes i
       WHERE i.status = 'fechado'
         AND i.valor_projeto IS NOT NULL
         AND date_trunc('month', i.updated_at AT TIME ZONE 'UTC') =
             date_trunc('month', (now() AT TIME ZONE 'UTC'))),
      0
    ) AS faturamento_mes,
    coalesce(
      (SELECT sum(c.valor)::numeric
       FROM public.comissoes c
       WHERE c.status = 'pago'),
      0
    ) AS total_comissoes_pagas,
    (SELECT count(*)::bigint FROM public.indicacoes) AS total_indicacoes,
    (SELECT count(*)::bigint FROM public.usuarios u WHERE u.role = 'indicador') AS total_indicadores;
END;
$$;

COMMENT ON FUNCTION public.get_admin_dashboard_summary() IS
  'Métricas financeiras admin: faturamento=valor_projeto (fechado); mês=atualizado no mês corrente (updated_at); comissões pagas=soma pago; contagens globais.';

REVOKE ALL ON FUNCTION public.get_admin_dashboard_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary() TO authenticated;
