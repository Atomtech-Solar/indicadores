-- Subconsultas em policies RLS e no trigger herdam RLS de public.usuarios.
-- Admin só enxerga a própria linha (usuarios_select_own), então EXISTS em outros
-- indicadores falhava e bloqueava upload (storage) e insert (indicacoes).
-- Helpers SECURITY DEFINER + guard is_admin() para validar alvo sem vazar dados.

create or replace function public.admin_comprovante_path_belongs_to_indicador(p_object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return false;
  end if;
  return exists (
    select 1
    from public.usuarios t
    where t.role = 'indicador'
      and split_part(trim(both '/' from coalesce(p_object_name, '')), '/', 1) <> ''
      and split_part(trim(both '/' from coalesce(p_object_name, '')), '/', 1) = t.usuario_id::text
  );
end;
$$;

create or replace function public.admin_indicacao_usuario_pk_is_indicador(p_usuarios_pk bigint)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    return false;
  end if;
  if p_usuarios_pk is null then
    return false;
  end if;
  return exists (
    select 1
    from public.usuarios t
    where t.id = p_usuarios_pk
      and t.role = 'indicador'
  );
end;
$$;

revoke all on function public.admin_comprovante_path_belongs_to_indicador(text) from public;
grant execute on function public.admin_comprovante_path_belongs_to_indicador(text) to authenticated;

revoke all on function public.admin_indicacao_usuario_pk_is_indicador(bigint) from public;
grant execute on function public.admin_indicacao_usuario_pk_is_indicador(bigint) to authenticated;

-- Storage: admin envia na pasta UUID (auth) do indicador
drop policy if exists "indicacoes_comprovantes_insert_admin_para_indicador" on storage.objects;
create policy "indicacoes_comprovantes_insert_admin_para_indicador"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'indicacoes-comprovantes'
  and public.admin_comprovante_path_belongs_to_indicador(name)
);

-- Indicacoes: insert em nome do indicador (PK em usuarios.id)
drop policy if exists indicacoes_insert_admin_on_behalf on public.indicacoes;
create policy indicacoes_insert_admin_on_behalf
on public.indicacoes
for insert
to authenticated
with check (public.admin_indicacao_usuario_pk_is_indicador(indicacoes.usuario_id));

-- Trigger: mesma leitura cross-user; usar helper
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
    if not public.admin_indicacao_usuario_pk_is_indicador(new.usuario_id) then
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
