-- Exclusão de indicação pela Edge admin-ops: roda com privilégios do dono da função,
-- sem depender de GRANT DELETE em public.indicacoes para service_role.
CREATE OR REPLACE FUNCTION public.admin_delete_indicacao(target_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.indicacoes
  WHERE id = target_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_FOUND'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.admin_delete_indicacao(bigint) IS
  'Usado apenas pela Edge admin-ops (JWT service_role). Apaga indicação e comissões em CASCADE.';

REVOKE ALL ON FUNCTION public.admin_delete_indicacao(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_indicacao(bigint) TO service_role;
