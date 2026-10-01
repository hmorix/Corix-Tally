-- Corix Tally — Supabase schema
-- Run once in Supabase SQL Editor (Project -> SQL Editor -> New query -> paste -> Run).
-- Every table is scoped to auth.uid() via Row Level Security, so each signed-in
-- user only ever sees their own companies/ledgers/vouchers.

create extension if not exists "uuid-ossp";

-- 1. Profile (extends auth.users). Created automatically on signup by the trigger below.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  google_sheet_id text,
  google_access_token text,
  entry_limit integer not null default 50000,
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "profile is own" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Companies
create table if not exists companies (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  gstin text,
  state text,
  financial_year_start date not null default date_trunc('year', now()),
  created_at timestamptz not null default now()
);
alter table companies enable row level security;
create policy "company is own" on companies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. Ledger groups
create table if not exists ledger_groups (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  nature text not null check (nature in ('asset','liability','income','expense')),
  is_system boolean not null default false
);
alter table ledger_groups enable row level security;
create policy "group via own company" on ledger_groups
  for all using (exists (select 1 from companies c where c.id = company_id and c.user_id = auth.uid()))
  with check (exists (select 1 from companies c where c.id = company_id and c.user_id = auth.uid()));

-- 4. Ledgers
create table if not exists ledgers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  group_id uuid references ledger_groups(id) on delete set null,
  name text not null,
  opening_balance numeric(14,2) not null default 0,
  opening_balance_type text not null default 'debit' check (opening_balance_type in ('debit','credit')),
  gstin text,
  gst_rate numeric(5,2),
  created_at timestamptz not null default now()
);
alter table ledgers enable row level security;
create policy "ledger via own company" on ledgers
  for all using (exists (select 1 from companies c where c.id = company_id and c.user_id = auth.uid()))
  with check (exists (select 1 from companies c where c.id = company_id and c.user_id = auth.uid()));

-- 5. Vouchers
create table if not exists vouchers (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  voucher_type text not null check (voucher_type in ('payment','receipt','contra','journal','sales','purchase')),
  voucher_number text,
  voucher_date date not null default current_date,
  narration text,
  party_name text,
  party_gstin text,
  place_of_supply text,
  invoice_number text,
  invoice_type text default 'regular',
  created_at timestamptz not null default now()
);
alter table vouchers enable row level security;
create policy "voucher via own company" on vouchers
  for all using (exists (select 1 from companies c where c.id = company_id and c.user_id = auth.uid()))
  with check (exists (select 1 from companies c where c.id = company_id and c.user_id = auth.uid()));

-- 6. Voucher entries (double-entry lines)
create table if not exists voucher_entries (
  id uuid primary key default uuid_generate_v4(),
  voucher_id uuid not null references vouchers(id) on delete cascade,
  ledger_id uuid not null references ledgers(id) on delete restrict,
  debit numeric(14,2) not null default 0,
  credit numeric(14,2) not null default 0
);
alter table voucher_entries enable row level security;
create policy "entry via own voucher" on voucher_entries
  for all using (exists (
    select 1 from vouchers v join companies c on c.id = v.company_id
    where v.id = voucher_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from vouchers v join companies c on c.id = v.company_id
    where v.id = voucher_id and c.user_id = auth.uid()
  ));

-- 7. Safety cap: free plan = max 50,000 voucher_entries per user, across all companies.
create or replace function public.enforce_entry_limit()
returns trigger as $$
declare
  owner uuid;
  current_count integer;
  cap integer;
begin
  select c.user_id into owner
  from vouchers v join companies c on c.id = v.company_id
  where v.id = new.voucher_id;

  select entry_limit into cap from profiles where id = owner;

  select count(*) into current_count
  from voucher_entries ve
  join vouchers v on v.id = ve.voucher_id
  join companies c on c.id = v.company_id
  where c.user_id = owner;

  if current_count >= coalesce(cap, 50000) then
    raise exception 'Entry limit reached (% entries). Delete old practice data to continue.', cap;
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_entry_limit on voucher_entries;
create trigger trg_entry_limit
  before insert on voucher_entries
  for each row execute procedure public.enforce_entry_limit();

-- 8. Seed default ledger groups for a new company. Call from the app right after
-- creating a company: supabase.rpc('seed_default_groups', { target_company: companyId })
create or replace function public.seed_default_groups(target_company uuid)
returns void as $$
begin
  insert into ledger_groups (company_id, name, nature, is_system) values
    (target_company, 'Capital Account', 'liability', true),
    (target_company, 'Loans (Liability)', 'liability', true),
    (target_company, 'Sundry Creditors', 'liability', true),
    (target_company, 'Duties & Taxes', 'liability', true),
    (target_company, 'Fixed Assets', 'asset', true),
    (target_company, 'Sundry Debtors', 'asset', true),
    (target_company, 'Cash-in-hand', 'asset', true),
    (target_company, 'Bank Accounts', 'asset', true),
    (target_company, 'Sales Accounts', 'income', true),
    (target_company, 'Purchase Accounts', 'expense', true),
    (target_company, 'Direct Expenses', 'expense', true),
    (target_company, 'Indirect Expenses', 'expense', true),
    (target_company, 'Direct Income', 'income', true),
    (target_company, 'Indirect Income', 'income', true);
end;
$$ language plpgsql security definer;

-- 9. Audit log — "who changed what, when" (see migrations/003 for existing installs)
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy "audit log is own" on audit_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists audit_log_company_idx on audit_log(company_id, created_at desc);
