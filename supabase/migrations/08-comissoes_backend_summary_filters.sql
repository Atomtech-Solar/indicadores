-- Comissoes: logica financeira no backend + preparo para admin

-- ---------------------------------------------------------------------------
-- 1) Integridade de status (inclui cancelado)
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.comissoes'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%status%'
      AND pg_get_constraintdef(c.oid) ILIKE '%pendente%'
      AND pg_get_constraintdef(c.oid) ILIKE '%disponivel%'
      AND pg_get_constraintdef(c.oid) ILIKE '%pago%'
  LOOP
    EXECUTE format('ALTER TABLE public.comissoes DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.comissoes
  ADD CONSTRAINT comissoes_status_check
  CHECK (status IN ('pendente', 'disponivel', 'pago', 'cancelado'));

COMMENT ON COLUMN public.comissoes.status IS
  'Status financeiro: pendente | disponivel | pago | cancelado.';

-- ---------------------------------------------------------------------------
-- 2) Proteger DELETE em comissoes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_delete_comissoes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'delete_not_allowed_on_comissoes';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_delete_comissoes ON public.comissoes;
CREATE TRIGGER trg_prevent_delete_comissoes
  BEFORE DELETE ON public.comissoes
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_delete_comissoes();

-- ---------------------------------------------------------------------------
-- 3) View dashboard (join comissoes + indicacoes)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_comissoes_dashboard
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.valor,
  c.status,
  c.created_at,
  i.nome_indicado
FROM public.comissoes c
JOIN public.indicacoes i ON i.id = c.indicacao_id;

COMMENT ON VIEW public.vw_comissoes_dashboard IS
  'View para dashboard de comissoes com nome do indicado.';

GRANT SELECT ON public.vw_comissoes_dashboard TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) Helpers para futuro modo admin (com parametro usuario_id)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public._is_admin_request()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT coalesce(current_setting('request.jwt.claim.role', true), '') IN ('service_role', 'supabase_admin');
$$;

CREATE OR REPLACE FUNCTION public._resolve_usuario_id_secure(p_usuario_id bigint DEFAULT NULL)
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
    IF public._is_admin_request() THEN
      RETURN p_usuario_id;
    END IF;
    RAISE EXCEPTION 'forbidden_usuario_id_override';
  END IF;

  v_usuario_id := public.get_my_usuario_id();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'usuario_id_not_found_for_authenticated_user';
  END IF;

  RETURN v_usuario_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5) RPC resumo de comissoes
-- ---------------------------------------------------------------------------

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
  )
  SELECT
    coalesce(SUM(c.valor), 0)::numeric AS total_acumulado,
    coalesce(SUM(c.valor) FILTER (WHERE c.status = 'pendente'), 0)::numeric AS total_pendente,
    coalesce(SUM(c.valor) FILTER (WHERE c.status = 'pago'), 0)::numeric AS total_pago
  FROM public.comissoes c
  JOIN ctx ON ctx.usuario_id = c.usuario_id;
$$;

COMMENT ON FUNCTION public.get_comissoes_summary(bigint) IS
  'Resumo financeiro de comissoes. p_usuario_id reservado para modo admin.';

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

-- ---------------------------------------------------------------------------
-- 6) RPC listagem filtrada
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_comissoes_filtradas(
  p_period text,
  p_status text,
  p_usuario_id bigint DEFAULT NULL
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
  'Lista comissoes filtradas por periodo/status. p_usuario_id reservado para modo admin.';

-- Compatibilidade com assinatura pedida
CREATE OR REPLACE FUNCTION public.get_comissoes_filtradas(p_period text, p_status text)
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
  SELECT * FROM public.get_comissoes_filtradas(p_period, p_status, NULL);
$$;

GRANT EXECUTE ON FUNCTION public.get_comissoes_filtradas(text, text, bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_comissoes_filtradas(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 7) Auditoria de alteracao de status
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.log_comissao_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.atividades (usuario_id, tipo, descricao, metadata)
    VALUES (
      NEW.usuario_id,
      'comissao_status_alterado',
      format('Comissão %s alterada para status: %s', NEW.id, NEW.status),
      jsonb_build_object(
        'comissao_id', NEW.id,
        'status_anterior', OLD.status,
        'status_novo', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_comissoes_log_status_change ON public.comissoes;
CREATE TRIGGER trg_comissoes_log_status_change
  AFTER UPDATE ON public.comissoes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_comissao_status_change();
