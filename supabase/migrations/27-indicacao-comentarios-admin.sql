-- Comentários administrativos por projeto (indicação)
create table if not exists public.indicacao_comentarios_admin (
  id bigserial primary key,
  indicacao_id bigint not null references public.indicacoes (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  comentario text not null check (char_length(trim(comentario)) > 0 and char_length(comentario) <= 1200),
  created_at timestamptz not null default now()
);

create index if not exists idx_indicacao_comentarios_admin_indicacao_id_created_at
  on public.indicacao_comentarios_admin (indicacao_id, created_at desc);

create index if not exists idx_indicacao_comentarios_admin_usuario_id
  on public.indicacao_comentarios_admin (usuario_id);

alter table public.indicacao_comentarios_admin enable row level security;

grant select, insert on public.indicacao_comentarios_admin to authenticated;
grant usage, select on sequence public.indicacao_comentarios_admin_id_seq to authenticated;

drop policy if exists "Admins podem listar comentários de projetos" on public.indicacao_comentarios_admin;
create policy "Admins podem listar comentários de projetos"
on public.indicacao_comentarios_admin
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.usuario_id = auth.uid()
      and u.role = 'admin'
  )
);

drop policy if exists "Admins podem inserir comentários de projetos" on public.indicacao_comentarios_admin;
create policy "Admins podem inserir comentários de projetos"
on public.indicacao_comentarios_admin
for insert
to authenticated
with check (
  exists (
    select 1
    from public.usuarios u
    where u.usuario_id = auth.uid()
      and u.role = 'admin'
  )
);
