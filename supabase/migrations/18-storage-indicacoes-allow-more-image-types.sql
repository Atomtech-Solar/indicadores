-- Ajuste de formatos aceitos no bucket de comprovantes
-- Evita erro 400 para imagens comuns de celular (ex.: HEIC/HEIF)

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif'
]
WHERE id = 'indicacoes-comprovantes';
