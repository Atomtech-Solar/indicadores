-- Fase C: relatório admin "reports" agregado no Postgres (substitui 3 listagens na Edge).
-- Mesma forma de segurança que get_admin_analytics: SECURITY DEFINER + _is_admin_request() OR is_admin().

DROP FUNCTION IF EXISTS public.get_admin_reports();

CREATE OR REPLACE FUNCTION public.get_admin_reports()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public._is_admin_request() OR public.is_admin()) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  WITH ind_agg AS (
    SELECT
      i.usuario_id,
      COUNT(*)::bigint AS total_indicacoes,
      COUNT(*) FILTER (WHERE i.status = 'fechado')::bigint AS total_fechadas
    FROM public.indicacoes i
    GROUP BY i.usuario_id
  ),
  com_agg AS (
    SELECT
      c.usuario_id,
      COALESCE(SUM(c.valor), 0)::numeric AS receita
    FROM public.comissoes c
    GROUP BY c.usuario_id
  ),
  stats AS (
    SELECT
      u.id,
      COALESCE(NULLIF(trim(u.nome), ''), 'Sem nome') AS nome,
      COALESCE(ia.total_indicacoes, 0::bigint) AS total_indicacoes,
      COALESCE(ia.total_fechadas, 0::bigint) AS total_fechadas,
      COALESCE(ca.receita, 0::numeric) AS receita
    FROM public.usuarios u
    LEFT JOIN ind_agg ia ON ia.usuario_id = u.id
    LEFT JOIN com_agg ca ON ca.usuario_id = u.id
  ),
  ind_tot AS (
    SELECT COUNT(*)::bigint AS c FROM public.indicacoes
  ),
  ind_closed AS (
    SELECT COUNT(*)::bigint AS c FROM public.indicacoes WHERE status = 'fechado'
  ),
  ranking_rows AS (
    SELECT jsonb_build_object(
      'nome', s.nome,
      'totalIndicacoes', s.total_indicacoes,
      'totalFechadas', s.total_fechadas,
      'receita', s.receita
    ) AS row_obj
    FROM stats s
    ORDER BY s.receita DESC NULLS LAST, s.nome ASC
    LIMIT 10
  )
  SELECT jsonb_build_object(
    'ranking', COALESCE((SELECT jsonb_agg(r.row_obj) FROM ranking_rows r), '[]'::jsonb),
    'conversionRate', (
      SELECT CASE WHEN it.c > 0 THEN round((cls.c::numeric / it.c::numeric) * 100, 4) ELSE 0::numeric END
      FROM ind_tot it
      CROSS JOIN ind_closed cls
    ),
    'aggregates', jsonb_build_object(
      'totalUsuarios', (SELECT COUNT(*)::bigint FROM public.usuarios),
      'totalIndicacoes', (SELECT c FROM ind_tot),
      'totalComissoes', (SELECT COUNT(*)::bigint FROM public.comissoes),
      'receitaPaga', (
        SELECT COALESCE(SUM(c.valor), 0)::numeric
        FROM public.comissoes c
        WHERE c.status = 'pago'
      )
    )
  ) INTO result;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_admin_reports() IS
  'Resumo admin (aba legada reports): ranking top 10 por soma de comissões, taxa de conversão (fechado/total indicações), totais globais. Sem limite artificial de 1000 linhas.';

REVOKE ALL ON FUNCTION public.get_admin_reports() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_reports() TO authenticated;
