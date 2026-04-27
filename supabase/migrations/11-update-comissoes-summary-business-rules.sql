-- Ajuste das regras de resumo financeiro para dashboard do indicador
-- Regra final solicitada:
-- 1) Total acumulado: considera apenas status da indicacao em negociacao
-- 2) Saldo pendente: considera apenas status da indicacao em fechado
-- 3) Total pago: status financeiro definido pelo admin (pago/concluido)

CREATE OR REPLACE FUNCTION public.get_comissoes_summary(p_usuario_id bigint DEFAULT NULL)
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
          WHEN comissao_status IN ('pago', 'concluido') THEN coalesce(comissao_valor, 0)
          ELSE 0
        END
      ),
      0
    )::numeric AS total_pago
  FROM base;
$$;

COMMENT ON FUNCTION public.get_comissoes_summary(bigint) IS
  'Resumo financeiro por regra de negocio: acumulado=negociacao; pendente=fechado; pago depende apenas do status financeiro definido pelo admin.';

-- Compatibilidade com chamada sem parametro
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
  SELECT * FROM public.get_comissoes_summary(NULL);
$$;

GRANT EXECUTE ON FUNCTION public.get_comissoes_summary(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_comissoes_summary() TO authenticated;
