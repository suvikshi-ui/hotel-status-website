-- Room type settings the owner can edit: nightly price and public visibility.
-- Nothing is deleted; a hidden type keeps its bookings, blocks and inventory.
alter table room_inventory add column if not exists price integer;
alter table room_inventory add column if not exists is_active boolean not null default true;
alter table room_inventory add column if not exists sort_order integer not null default 0;

-- Prices approved by the owner (28 Oct 2026). Super Deluxe keeps its old price but is hidden.
update room_inventory set price = 2500, sort_order = 1 where room_type = 'deluxe';
update room_inventory set price = coalesce(price, 3499), sort_order = 2, is_active = false where room_type = 'super-deluxe';
update room_inventory set price = 6000, sort_order = 3 where room_type = 'suite';
update room_inventory set price = 0 where price is null;
alter table room_inventory alter column price set default 0;
alter table room_inventory alter column price set not null;
do $$ begin
  alter table room_inventory add constraint room_inventory_price check (price >= 0);
exception when duplicate_object then null; end $$;

-- Referral codes handed to agents. Both percentages are set by the owner per code.
create table if not exists referral_codes (
  id bigserial primary key,
  label text not null,
  code text not null,
  agent_name text not null,
  agent_phone text not null default '',
  agent_email text not null default '',
  guest_discount_percent numeric(5,2) not null check (guest_discount_percent >= 0 and guest_discount_percent <= 100),
  agent_percent numeric(5,2) not null check (agent_percent >= 0 and agent_percent <= 100),
  active boolean not null default true,
  valid_from date,
  valid_to date,
  max_uses integer check (max_uses is null or max_uses > 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (guest_discount_percent + agent_percent <= 100),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);
create unique index if not exists referral_codes_code_lower on referral_codes (lower(code));

-- Per booking: the code used, the list price before discount, the guest
-- discount taken off, and the agent commission owed (both on the list price).
alter table bookings add column if not exists referral_code_id bigint references referral_codes (id);
alter table bookings add column if not exists list_amount integer;
alter table bookings add column if not exists guest_discount_amount integer not null default 0;
alter table bookings add column if not exists agent_commission_amount integer not null default 0;
alter table bookings add column if not exists agent_commission_paid_at timestamptz;
create index if not exists bookings_referral_code_idx on bookings (referral_code_id);
