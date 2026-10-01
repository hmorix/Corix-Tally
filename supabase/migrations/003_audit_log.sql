-- Corix Tally — migration 003: audit log table, for the "who changed what,
-- when" feature. Safe to run on a fresh install too.

create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  entity_type text not null,   -- 'ledger' | 'voucher'
  entity_id uuid not null,
  action text not null,        -- 'create' | 'update' | 'delete'
  detail text,
  created_at timestamptz not null default now()
);
alter table audit_log enable row level security;
create policy "audit log is own" on audit_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists audit_log_company_idx on audit_log(company_id, created_at desc);
