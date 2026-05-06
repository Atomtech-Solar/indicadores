-- O trigger prevent_delete_comissoes bloqueia DELETE em comissoes.
-- Ao apagar indicacoes, o FK ON DELETE CASCADE tentava apagar comissoes e falhava.
-- Solução: permitir DELETE em comissoes só dentro da transação iniciada por admin_delete_indicacao
-- (session setting transaction-local).

CREATE OR REPLACE FUNCTION public.prevent_delete_comissoes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(current_setting('app.allow_comissao_delete', true), '') = 'on' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'delete_not_allowed_on_comissoes'
    USING ERRCODE = 'P0001';
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_indicacao(target_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.allow_comissao_delete', 'on', true);

  DELETE FROM public.comissoes
  WHERE indicacao_id = target_id;

  DELETE FROM public.indicacoes
  WHERE id = target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_delete_indicacao(bigint) IS
  'Edge admin-ops: apaga comissões da indicação (com bypass controlado do trigger) e depois a indicação.';
