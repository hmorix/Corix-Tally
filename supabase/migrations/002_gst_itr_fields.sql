-- Corix Tally — migration 002: adds invoice-level fields needed for real
-- GSTR-1 (B2B/B2C tables need recipient GSTIN, invoice no., place of supply).
-- Safe to run on a fresh install too (all guarded with IF NOT EXISTS).
-- If you're setting up FRESH, schema.sql already includes these columns —
-- you don't need this file too.

alter table vouchers add column if not exists party_name text;
alter table vouchers add column if not exists party_gstin text;
alter table vouchers add column if not exists place_of_supply text;
alter table vouchers add column if not exists invoice_number text;
alter table vouchers add column if not exists invoice_type text default 'regular';
