-- Admin pode criar indicação em nome de um indicador (usuario_id do indicador).
-- Trigger: se for admin, respeita NEW.usuario_id (deve ser um usuário role indicador);
-- caso contrário, mantém comportamento anterior (força get_my_usuario_id).
-- RLS: política extra de INSERT para admin.
-- Storage: admin envia fotos na pasta do UUID do indicador; indicador lê anexos ligados às próprias indicações.

create or replace function public.indicacoes_enforce_usuario_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_me bigint;
  v_is_admin boolean;
begin
  select exists (
    select 1
    from public.usuarios u
    where u.usuario_id = auth.uid()
      and u.role = 'admin'
  ) into v_is_admin;

  if v_is_admin then
    if new.usuario_id is null then
      raise exception 'admin_insert_requires_usuario_id';
    end if;
    if not exists (
      select 1
      from public.usuarios t
      where t.id = new.usuario_id
        and t.role = 'indicador'
    ) then
      raise exception 'admin_insert_usuario_id_must_be_indicador';
    end if;
    return new;
  end if;

  v_me := public.get_my_usuario_id();
  if v_me is null then
    raise exception 'usuario_id_not_found_for_authenticated_user';
  end if;
  new.usuario_id := v_me;
  return new;
end;
$$;

drop policy if exists indicacoes_insert_admin_on_behalf on public.indicacoes;
create policy indicacoes_insert_admin_on_behalf
on public.indicacoes
for insert
to authenticated
with check (
  public.is_admin()
  and exists (
    select 1
    from public.usuarios t
    where t.id = indicacoes.usuario_id
      and t.role = 'indicador'
  )
);

-- Admin: upload na pasta do UUID do indicador (primeiro segmento = usuarios.usuario_id do indicador alvo)
drop policy if exists "indicacoes_comprovantes_insert_admin_para_indicador" on storage.objects;
create policy "indicacoes_comprovantes_insert_admin_para_indicador"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'indicacoes-comprovantes'
  and public.is_admin()
  and exists (
    select 1
    from public.usuarios t
    where t.role = 'indicador'
      and split_part(name, '/', 1) = t.usuario_id::text
  )
);

-- Indicador: ler arquivo se estiver anexado a alguma indicação sua (qualquer pasta)
drop policy if exists "indicacoes_comprovantes_select_via_minha_indicacao" on storage.objects;
create policy "indicacoes_comprovantes_select_via_minha_indicacao"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'indicacoes-comprovantes'
  and exists (
    select 1
    from public.indicacoes i
    join public.usuarios u on u.id = i.usuario_id
    where u.usuario_id = auth.uid()
      and (
        i.conta_energia_url = name
        or i.foto_padrao_url = name
        or i.foto_extra_1_url = name
        or i.foto_extra_2_url = name
      )
  )
);
