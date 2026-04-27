-- Roles e hardening RLS para modelo indicador/admin (Zero Trust)

-- ---------------------------------------------------------------------------
-- 1) usuarios.role
-- ---------------------------------------------------------------------------
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'indicador';

UPDATE public.usuarios
SET role = 'indicador'
WHERE role IS NULL;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'public.usuarios'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%role%'
  LOOP
    EXECUTE format('ALTER TABLE public.usuarios DROP CONSTRAINT %I', r.conname);
  END LOOP;
END;
$$;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_role_check
  CHECK (role IN ('indicador', 'admin'));

COMMENT ON COLUMN public.usuarios.role IS
  'Role de acesso da plataforma: indicador | admin.';

-- ---------------------------------------------------------------------------
-- 2) Função auxiliar de autorização
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.usuarios u
    WHERE u.usuario_id = auth.uid()
      AND u.role = 'admin'
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) usuarios_update_own: usuário não pode alterar o próprio role
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS usuarios_update_own ON public.usuarios;
CREATE POLICY usuarios_update_own ON public.usuarios
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (
    usuario_id = auth.uid()
    AND role = (
      SELECT u.role
      FROM public.usuarios u
      WHERE u.id = usuarios.id
    )
  );

-- ---------------------------------------------------------------------------
-- 4) RLS de leitura com escopo admin/own
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS indicacoes_select_own ON public.indicacoes;
CREATE POLICY indicacoes_select_own ON public.indicacoes
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = indicacoes.usuario_id
        AND u.usuario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS comissoes_select_own ON public.comissoes;
CREATE POLICY comissoes_select_own ON public.comissoes
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = comissoes.usuario_id
        AND u.usuario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS atividades_select_own ON public.atividades;
CREATE POLICY atividades_select_own ON public.atividades
  FOR SELECT TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = atividades.usuario_id
        AND u.usuario_id = auth.uid()
    )
  );
