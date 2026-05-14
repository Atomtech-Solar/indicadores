create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists push_tokens_user_id_token_idx
on public.push_tokens (user_id, token);

alter table public.push_tokens enable row level security;

grant select, insert, update, delete on public.push_tokens to authenticated;

create policy "Users can view their own push tokens"
on public.push_tokens
for select
using (auth.uid() = user_id);

create policy "Users can insert their own push tokens"
on public.push_tokens
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own push tokens"
on public.push_tokens
for update
using (auth.uid() = user_id);

create policy "Users can delete their own push tokens"
on public.push_tokens
for delete
using (auth.uid() = user_id);
