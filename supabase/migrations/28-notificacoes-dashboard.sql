create table if not exists public.notificacoes (
  id bigserial primary key,
  destinatario_usuario_id bigint not null references public.usuarios (id) on delete cascade,
  evento text not null,
  titulo text not null,
  mensagem text not null,
  entidade_tipo text null,
  entidade_id bigint null,
  ator_usuario_id bigint null references public.usuarios (id) on delete set null,
  ator_nome text null,
  metadata jsonb not null default '{}'::jsonb,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notificacoes_destinatario_created_at
  on public.notificacoes (destinatario_usuario_id, created_at desc);

create index if not exists idx_notificacoes_destinatario_lida
  on public.notificacoes (destinatario_usuario_id, lida);

alter table public.notificacoes enable row level security;

grant select, update on public.notificacoes to authenticated;

drop policy if exists "Usuário lê suas notificações" on public.notificacoes;
create policy "Usuário lê suas notificações"
on public.notificacoes
for select
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = notificacoes.destinatario_usuario_id
      and u.usuario_id = auth.uid()
  )
);

drop policy if exists "Usuário marca suas notificações como lidas" on public.notificacoes;
create policy "Usuário marca suas notificações como lidas"
on public.notificacoes
for update
to authenticated
using (
  exists (
    select 1
    from public.usuarios u
    where u.id = notificacoes.destinatario_usuario_id
      and u.usuario_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.usuarios u
    where u.id = notificacoes.destinatario_usuario_id
      and u.usuario_id = auth.uid()
  )
);

create or replace function public.notify_admins_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notificacoes (
    destinatario_usuario_id,
    evento,
    titulo,
    mensagem,
    entidade_tipo,
    entidade_id
  )
  select
    a.id,
    'usuario_criado',
    'Novo usuário cadastrado',
    format('%s entrou na plataforma.', coalesce(new.nome, 'Usuário')),
    'usuarios',
    new.id
  from public.usuarios a
  where a.role = 'admin'
    and a.id <> new.id;

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_new_user on public.usuarios;
create trigger trg_notify_admins_new_user
after insert on public.usuarios
for each row
execute function public.notify_admins_new_user();

create or replace function public.notify_indicador_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.notificacoes (
      destinatario_usuario_id,
      evento,
      titulo,
      mensagem,
      entidade_tipo,
      entidade_id,
      metadata
    )
    values (
      new.usuario_id,
      'status_indicacao_alterado',
      'Status da indicação atualizado',
      format(
        'A indicação "%s" mudou de %s para %s.',
        coalesce(new.nome_indicado, 'sem nome'),
        coalesce(old.status, '—'),
        coalesce(new.status, '—')
      ),
      'indicacoes',
      new.id,
      jsonb_build_object('status_anterior', old.status, 'status_novo', new.status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_indicador_status_change on public.indicacoes;
create trigger trg_notify_indicador_status_change
after update of status on public.indicacoes
for each row
when (old.status is distinct from new.status)
execute function public.notify_indicador_status_change();
