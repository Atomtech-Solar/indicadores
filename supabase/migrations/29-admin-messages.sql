-- Central de mensagens rápidas para dashboard admin

create table if not exists public.admin_messages (
  id bigserial primary key,
  title text not null check (char_length(trim(title)) between 3 and 120),
  category text not null check (char_length(trim(category)) between 2 and 60),
  content text not null check (char_length(trim(content)) between 5 and 5000),
  is_favorite boolean not null default false,
  usage_count integer not null default 0 check (usage_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by bigint not null references public.usuarios (id) on delete restrict
);

create index if not exists idx_admin_messages_updated_at
  on public.admin_messages (updated_at desc);

create index if not exists idx_admin_messages_category
  on public.admin_messages (category);

create index if not exists idx_admin_messages_is_favorite
  on public.admin_messages (is_favorite);

create index if not exists idx_admin_messages_created_by
  on public.admin_messages (created_by);

create index if not exists idx_admin_messages_search
  on public.admin_messages using gin (to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(content, '')));

drop trigger if exists trg_admin_messages_set_updated_at on public.admin_messages;
create trigger trg_admin_messages_set_updated_at
before update on public.admin_messages
for each row
execute function public.set_updated_at();

alter table public.admin_messages enable row level security;

drop policy if exists "admin_messages_select_admin_only" on public.admin_messages;
create policy "admin_messages_select_admin_only"
on public.admin_messages
for select
to authenticated
using (public.is_admin());

drop policy if exists "admin_messages_insert_admin_only" on public.admin_messages;
create policy "admin_messages_insert_admin_only"
on public.admin_messages
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "admin_messages_update_admin_only" on public.admin_messages;
create policy "admin_messages_update_admin_only"
on public.admin_messages
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "admin_messages_delete_admin_only" on public.admin_messages;
create policy "admin_messages_delete_admin_only"
on public.admin_messages
for delete
to authenticated
using (public.is_admin());

grant select, insert, update, delete on public.admin_messages to authenticated;
grant usage, select on sequence public.admin_messages_id_seq to authenticated;

insert into public.admin_messages (title, category, content, is_favorite, usage_count, created_by)
select
  seed.title,
  seed.category,
  seed.content,
  seed.is_favorite,
  seed.usage_count,
  admin_user.id
from (
  values
    (
      'Primeiro contato - Energia Solar',
      'Primeiro Contato',
      'Olá {nome}, tudo bem? Aqui é da Atom Tech. Recebi seu interesse em energia solar para {empresa}. Posso te enviar uma simulação rápida sem compromisso?',
      true,
      0
    ),
    (
      'Follow-up comercial',
      'Follow-up',
      'Olá {nome}, passando para saber se conseguiu analisar nossa proposta. Se fizer sentido, podemos ajustar o melhor formato para {empresa}.',
      false,
      0
    ),
    (
      'Sem resposta - reativação',
      'Sem Resposta',
      'Oi {nome}, tudo certo? Vi que ainda não conseguimos avançar por aí. Quer que eu te envie um resumo objetivo com valores e próximos passos?',
      false,
      0
    ),
    (
      'Explicação de comissão',
      'Comissão',
      'Perfeito, {nome}. Assim que o projeto indicado for fechado e validado, a comissão é liberada no seu painel com total transparência dos valores.',
      true,
      0
    ),
    (
      'Carregador veicular - qualificação',
      'Carregador Veicular',
      'Olá {nome}, para avançar no carregador veicular, preciso de duas informações rápidas: modelo do veículo e padrão elétrico atual da unidade da {empresa}.',
      false,
      0
    ),
    (
      'Fechamento de proposta',
      'Fechamento',
      'Excelente notícia, {nome}! Conseguimos aprovar as condições finais. Podemos seguir com a assinatura para iniciar o projeto da {empresa}?',
      true,
      0
    )
) as seed(title, category, content, is_favorite, usage_count)
cross join lateral (
  select u.id
  from public.usuarios u
  where u.role = 'admin'
  order by u.created_at asc
  limit 1
) as admin_user
where not exists (select 1 from public.admin_messages);
