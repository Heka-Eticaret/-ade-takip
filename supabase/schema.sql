-- İADE TAKİP SİSTEMİ - SUPABASE VERİTABANI
-- Supabase Dashboard > SQL Editor ekranında tek sefer çalıştırın.

create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('admin', 'operator');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.return_arrival_status as enum ('bekliyor', 'geldi', 'gelmedi');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.return_decision_status as enum ('bekliyor', 'onay', 'red');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,30}$'),
  full_name text not null,
  role public.user_role not null default 'operator',
  created_at timestamptz not null default now()
);

create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(trim(customer_name)) between 2 and 150),
  product_name text not null check (char_length(trim(product_name)) between 2 and 250),
  quantity integer not null check (quantity between 1 and 9999),
  arrival_status public.return_arrival_status not null default 'bekliyor',
  decision_status public.return_decision_status not null default 'bekliyor',
  notes text check (notes is null or char_length(notes) <= 3000),
  created_by uuid not null references public.profiles(id),
  received_by uuid references public.profiles(id),
  checked_by uuid references public.profiles(id),
  logo_entered_by uuid references public.profiles(id),
  received_at timestamptz,
  checked_at timestamptz,
  logo_entered boolean not null default false,
  logo_entered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint decision_requires_arrival check (
    decision_status = 'bekliyor' or arrival_status = 'geldi'
  ),
  constraint logo_entry_requires_approval check (
    not logo_entered or decision_status = 'onay'
  )
);

-- Zaten kurulu veritabanlarında eksik olan Logo giriş alanlarını ekler.
alter table public.returns add column if not exists logo_entered boolean not null default false;
alter table public.returns add column if not exists logo_entered_by uuid references public.profiles(id);
alter table public.returns add column if not exists logo_entered_at timestamptz;

do $$
begin
  alter table public.returns add constraint logo_entry_requires_approval
    check (not logo_entered or decision_status = 'onay');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.return_logs (
  id bigint generated always as identity primary key,
  return_id uuid not null references public.returns(id) on delete cascade,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists returns_created_at_idx on public.returns(created_at desc);
create index if not exists returns_customer_name_idx on public.returns(customer_name);
create index if not exists returns_arrival_status_idx on public.returns(arrival_status);
create index if not exists returns_decision_status_idx on public.returns(decision_status);
create index if not exists return_logs_return_id_idx on public.return_logs(return_id, created_at desc);

-- Auth kullanıcısı oluşturulunca profilini otomatik hazırlar.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  generated_username text;
  generated_name text;
  generated_role public.user_role;
begin
  generated_username := lower(coalesce(
    new.raw_user_meta_data ->> 'username',
    split_part(new.email, '@', 1)
  ));

  generated_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    generated_username
  );

  generated_role := case
    when new.raw_user_meta_data ->> 'role' = 'admin' then 'admin'::public.user_role
    else 'operator'::public.user_role
  end;

  insert into public.profiles (id, username, full_name, role)
  values (new.id, generated_username, generated_name, generated_role)
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert or update of raw_user_meta_data on auth.users
for each row execute function public.handle_new_user();

-- Durum değişikliklerinde işlemi yapan kişiyi veritabanı kendisi kaydeder.
create or replace function public.apply_return_workflow()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    if actor_id is not null then
      new.created_by := actor_id;
    end if;
    new.updated_at := now();
    return new;
  end if;

  -- Oluşturan kullanıcı ve oluşturma zamanı sonradan değiştirilemez.
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();

  -- Kullanıcı, personel alanlarını doğrudan değiştiremez.
  new.received_by := old.received_by;
  new.received_at := old.received_at;
  new.checked_by := old.checked_by;
  new.checked_at := old.checked_at;
  new.logo_entered_by := old.logo_entered_by;
  new.logo_entered_at := old.logo_entered_at;

  if new.arrival_status is distinct from old.arrival_status then
    if new.arrival_status = 'geldi' then
      new.received_by := actor_id;
      new.received_at := now();
    else
      new.received_by := null;
      new.received_at := null;
      new.decision_status := 'bekliyor';
      new.checked_by := null;
      new.checked_at := null;
      new.logo_entered := false;
      new.logo_entered_by := null;
      new.logo_entered_at := null;
    end if;
  end if;

  if new.decision_status is distinct from old.decision_status then
    if new.decision_status <> 'bekliyor' and new.arrival_status <> 'geldi' then
      raise exception 'Kontrol kararı vermeden önce iade Geldi durumunda olmalıdır.';
    end if;

    if new.decision_status = 'bekliyor' then
      new.checked_by := null;
      new.checked_at := null;
    else
      new.checked_by := actor_id;
      new.checked_at := now();
    end if;

    if new.decision_status <> 'onay' then
      new.logo_entered := false;
      new.logo_entered_by := null;
      new.logo_entered_at := null;
    end if;
  end if;

  if new.logo_entered is distinct from old.logo_entered then
    if new.logo_entered and new.decision_status <> 'onay' then
      raise exception 'Logo girişi işaretlemeden önce iade onaylanmış olmalıdır.';
    end if;

    if new.logo_entered then
      new.logo_entered_by := actor_id;
      new.logo_entered_at := now();
    else
      new.logo_entered_by := null;
      new.logo_entered_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists returns_workflow_trigger on public.returns;
create trigger returns_workflow_trigger
before insert or update on public.returns
for each row execute function public.apply_return_workflow();

-- Her ekleme ve güncelleme için denetim kaydı tutar.
create or replace function public.log_return_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  action_text text;
begin
  if tg_op = 'INSERT' then
    action_text := 'İade kaydı oluşturuldu';
    insert into public.return_logs (return_id, action, old_data, new_data, changed_by)
    values (new.id, action_text, null, to_jsonb(new), auth.uid());
    return new;
  end if;

  if new.arrival_status is distinct from old.arrival_status
     and new.decision_status is distinct from old.decision_status then
    action_text := format(
      'Geliş durumu %s → %s; kontrol sonucu %s → %s',
      old.arrival_status::text,
      new.arrival_status::text,
      old.decision_status::text,
      new.decision_status::text
    );
  elsif new.arrival_status is distinct from old.arrival_status then
    action_text := format(
      'Geliş durumu %s → %s',
      old.arrival_status::text,
      new.arrival_status::text
    );
  elsif new.decision_status is distinct from old.decision_status then
    action_text := format(
      'Kontrol sonucu %s → %s',
      old.decision_status::text,
      new.decision_status::text
    );
  elsif new.logo_entered is distinct from old.logo_entered then
    action_text := case
      when new.logo_entered then 'Logo''ya giriş yapıldı'
      else 'Logo girişi yapılmadı olarak işaretlendi'
    end;
  elsif new.notes is distinct from old.notes then
    action_text := 'İade notu güncellendi';
  elsif new.customer_name is distinct from old.customer_name
     or new.product_name is distinct from old.product_name
     or new.quantity is distinct from old.quantity then
    action_text := 'İade bilgileri güncellendi';
  else
    action_text := 'İade kaydı güncellendi';
  end if;

  insert into public.return_logs (return_id, action, old_data, new_data, changed_by)
  values (new.id, action_text, to_jsonb(old), to_jsonb(new), auth.uid());

  return new;
end;
$$;

drop trigger if exists returns_audit_trigger on public.returns;
create trigger returns_audit_trigger
after insert or update on public.returns
for each row execute function public.log_return_change();

-- Satır bazlı güvenlik
alter table public.profiles enable row level security;
alter table public.returns enable row level security;
alter table public.return_logs enable row level security;

drop policy if exists profiles_read_authenticated on public.profiles;
create policy profiles_read_authenticated
on public.profiles for select
to authenticated
using (true);

drop policy if exists returns_read_authenticated on public.returns;
create policy returns_read_authenticated
on public.returns for select
to authenticated
using (true);

drop policy if exists returns_insert_authenticated on public.returns;
create policy returns_insert_authenticated
on public.returns for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists returns_update_authenticated on public.returns;
create policy returns_update_authenticated
on public.returns for update
to authenticated
using (true)
with check (true);

drop policy if exists returns_delete_admin on public.returns;
create policy returns_delete_admin
on public.returns for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists return_logs_read_authenticated on public.return_logs;
create policy return_logs_read_authenticated
on public.return_logs for select
to authenticated
using (true);

-- API yetkileri
grant usage on schema public to authenticated;
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.returns to authenticated;
grant select on public.return_logs to authenticated;
revoke insert, update, delete on public.profiles from authenticated;
revoke insert, update, delete on public.return_logs from authenticated;

-- İki kullanıcının ekranında değişikliklerin anlık görünmesi için Realtime.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'returns'
  ) then
    alter publication supabase_realtime add table public.returns;
  end if;
end $$;
