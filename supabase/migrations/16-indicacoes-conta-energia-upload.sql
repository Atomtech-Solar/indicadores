-- Upload de foto da conta de energia nas indicações
-- - adiciona coluna para armazenar o caminho do arquivo no Storage
-- - cria bucket privado de comprovantes
-- - adiciona policies para cada usuário manipular apenas a própria pasta (auth.uid)

ALTER TABLE public.indicacoes
  ADD COLUMN IF NOT EXISTS conta_energia_url text;

COMMENT ON COLUMN public.indicacoes.conta_energia_url IS
  'Caminho do arquivo da foto da conta de energia no bucket storage.indicacoes-comprovantes.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'indicacoes-comprovantes',
  'indicacoes-comprovantes',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "indicacoes_comprovantes_insert_own" ON storage.objects;
CREATE POLICY "indicacoes_comprovantes_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'indicacoes-comprovantes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "indicacoes_comprovantes_select_own" ON storage.objects;
CREATE POLICY "indicacoes_comprovantes_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'indicacoes-comprovantes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "indicacoes_comprovantes_update_own" ON storage.objects;
CREATE POLICY "indicacoes_comprovantes_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'indicacoes-comprovantes'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'indicacoes-comprovantes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "indicacoes_comprovantes_delete_own" ON storage.objects;
CREATE POLICY "indicacoes_comprovantes_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'indicacoes-comprovantes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
