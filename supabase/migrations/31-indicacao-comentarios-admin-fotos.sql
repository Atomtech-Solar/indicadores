-- Fotos anexas aos comentários administrativos (até 4) + bucket privado só para admins

alter table public.indicacao_comentarios_admin
  add column if not exists anexo_fotos_urls text[] not null default '{}';

comment on column public.indicacao_comentarios_admin.anexo_fotos_urls is
  'Até 4 caminhos de imagem no bucket storage.indicacao-comentarios-admin (array vazio = sem anexos).';

alter table public.indicacao_comentarios_admin
  drop constraint if exists indicacao_comentarios_admin_anexo_fotos_max4;

alter table public.indicacao_comentarios_admin
  add constraint indicacao_comentarios_admin_anexo_fotos_max4
  check (cardinality(anexo_fotos_urls) <= 4);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'indicacao-comentarios-admin',
  'indicacao-comentarios-admin',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
on conflict (id) do nothing;

drop policy if exists "indicacao_comentarios_admin_fotos_insert" on storage.objects;
create policy "indicacao_comentarios_admin_fotos_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'indicacao-comentarios-admin'
  and exists (
    select 1
    from public.usuarios u
    where u.usuario_id = auth.uid()
      and u.role = 'admin'
  )
);

drop policy if exists "indicacao_comentarios_admin_fotos_select" on storage.objects;
create policy "indicacao_comentarios_admin_fotos_select"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'indicacao-comentarios-admin'
  and exists (
    select 1
    from public.usuarios u
    where u.usuario_id = auth.uid()
      and u.role = 'admin'
  )
);

drop policy if exists "indicacao_comentarios_admin_fotos_delete" on storage.objects;
create policy "indicacao_comentarios_admin_fotos_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'indicacao-comentarios-admin'
  and exists (
    select 1
    from public.usuarios u
    where u.usuario_id = auth.uid()
      and u.role = 'admin'
  )
);
