-- Guest self-cancel token, refunds, and sequential GST invoice numbers.

alter table bookings add column if not exists manage_token text;
update bookings set manage_token = md5(random()::text || clock_timestamp()::text || id) where manage_token is null;
alter table bookings alter column manage_token set default md5(random()::text || clock_timestamp()::text);

alter table bookings add column if not exists cancelled_at timestamptz;
alter table bookings add column if not exists refund_amount integer not null default 0;
alter table bookings add column if not exists refund_id text;
alter table bookings add column if not exists refund_status text;
alter table bookings add column if not exists invoice_number text;
alter table bookings add column if not exists invoiced_at timestamptz;
create unique index if not exists bookings_invoice_number_key on bookings (invoice_number);

-- One running counter per Indian financial year (April to March).
create table if not exists invoice_counters (
  fy text primary key,
  last_no integer not null default 0
);

create or replace function financial_year(at timestamptz)
returns text
language sql
stable
as $$
  select case
    when extract(month from (at at time zone 'Asia/Kolkata')) >= 4
      then to_char(at at time zone 'Asia/Kolkata', 'YYYY') || '-' ||
           to_char((at at time zone 'Asia/Kolkata') + interval '1 year', 'YY')
    else to_char((at at time zone 'Asia/Kolkata') - interval '1 year', 'YYYY') || '-' ||
         to_char(at at time zone 'Asia/Kolkata', 'YY')
  end
$$;

create or replace function next_invoice_number()
returns text
language plpgsql
as $$
declare
  fy_now text := financial_year(now());
  n integer;
begin
  insert into invoice_counters (fy, last_no) values (fy_now, 1)
  on conflict (fy) do update set last_no = invoice_counters.last_no + 1
  returning last_no into n;
  return 'HSR/' || fy_now || '/' || lpad(n::text, 4, '0');
end;
$$;

-- A confirmed booking gets its invoice number when the first money arrives
-- (online payment or balance collected at the desk). Numbers never repeat.
create or replace function bookings_assign_invoice()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null and new.status = 'confirmed' and new.amount_paid > 0 then
    new.invoice_number := next_invoice_number();
    new.invoiced_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists bookings_assign_invoice on bookings;
create trigger bookings_assign_invoice
  before insert or update on bookings
  for each row execute function bookings_assign_invoice();
