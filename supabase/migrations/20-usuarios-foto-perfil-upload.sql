-- Foto de perfil no cadastro de usuários (indicador/admin).

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS foto_perfil_url text;

COMMENT ON COLUMN public.usuarios.foto_perfil_url IS
  'Caminho do arquivo da foto de perfil no bucket storage.perfil-fotos.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'perfil-fotos',
  'perfil-fotos',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "perfil_fotos_insert_own" ON storage.objects;
CREATE POLICY "perfil_fotos_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'perfil-fotos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "perfil_fotos_select_own" ON storage.objects;
CREATE POLICY "perfil_fotos_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'perfil-fotos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "perfil_fotos_update_own" ON storage.objects;
CREATE POLICY "perfil_fotos_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'perfil-fotos'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'perfil-fotos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "perfil_fotos_delete_own" ON storage.objects;
CREATE POLICY "perfil_fotos_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'perfil-fotos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
