-- 1) Permitir perfil parcial no primeiro momento.
ALTER TABLE public.usuarios
  ALTER COLUMN nome DROP NOT NULL,
  ALTER COLUMN whatsapp DROP NOT NULL;

-- 2) Criar função que sincroniza auth.users -> public.usuarios.
CREATE OR REPLACE FUNCTION public.handle_new_user ()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.usuarios (usuario_id, created_at)
  VALUES (NEW.id, now())
  ON CONFLICT (usuario_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3) Trigger após criação de usuário em auth.users.
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user ();
