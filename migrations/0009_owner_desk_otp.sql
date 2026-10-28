-- Owner desk: email one-time-code login, owner sessions, check-in/out.
-- Passwords are no longer used for the owner desk: login is by emailed code.

create table if not exists owner_accounts (
  email text primary key,
  name text not null default '',
  created_at timestamptz not null default now()
);

insert into owner_accounts (email, name) values ('contact@hotelstatusresidency.com', 'Hotel Status Residency')
on conflict (email) do nothing;

-- One row per code sent. Only the SHA-256 of the code is stored.
create table if not exists owner_login_codes (
  id bigserial primary key,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used_at timestamptz,
  ip text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists owner_login_codes_email on owner_login_codes (email, created_at desc);
create index if not exists owner_login_codes_ip on owner_login_codes (ip, created_at desc);

-- Sessions: only the SHA-256 of the cookie token is stored.
create table if not exists owner_sessions (
  token_hash text primary key,
  email text not null references owner_accounts (email) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- Stay lifecycle, separate from booking/payment status.
alter table bookings add column if not exists stay_status text not null default 'none';
alter table bookings add column if not exists checked_in_at timestamptz;
alter table bookings add column if not exists checked_out_at timestamptz;
do $$ begin
  alter table bookings add constraint bookings_stay_status_check
    check (stay_status in ('none', 'checked_in', 'checked_out'));
exception when duplicate_object then null; end $$;

-- Retire the old owner password login: clear stored password hashes.
delete from "account" where "providerId" = 'credential';
