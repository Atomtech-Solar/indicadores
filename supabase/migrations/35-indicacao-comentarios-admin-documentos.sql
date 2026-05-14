-- Documentos anexos aos comentários admin (até 2) + tipos MIME e limite no bucket

alter table public.indicacao_comentarios_admin
  add column if not exists anexo_documentos_urls text[] not null default '{}';

comment on column public.indicacao_comentarios_admin.anexo_documentos_urls is
  'Até 2 caminhos de documento (PDF, Office, etc.) no bucket storage.indicacao-comentarios-admin.';

alter table public.indicacao_comentarios_admin
  drop constraint if exists indicacao_comentarios_admin_anexo_docs_max2;

alter table public.indicacao_comentarios_admin
  add constraint indicacao_comentarios_admin_anexo_docs_max2
  check (cardinality(anexo_documentos_urls) <= 2);

update storage.buckets
set
  file_size_limit = 10485760,
  allowed_mime_types = array[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/csv'
  ]
where id = 'indicacao-comentarios-admin';
