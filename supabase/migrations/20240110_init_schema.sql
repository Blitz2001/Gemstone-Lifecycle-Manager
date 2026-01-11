-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. ENUMS
create type lot_stage_enum as enum (
  'PROCUREMENT',
  'PERFORMING',
  'GAS_BURN',
  'CUT_POLISH',
  'ELECTRIC_BURN',
  'SELL_READY'
);

-- 2. TABLES

-- PROFILES (User Roles)
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text,
  role text check (role in ('ADMIN', 'OPERATOR', 'VIEWER')),
  created_at timestamp with time zone default now()
);

-- SYSTEM CONFIG (Master Data)
create table system_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default now()
);

-- LOTS (Identity & Current State)
create table lots (
  id uuid default uuid_generate_v4() primary key,
  lot_code text unique not null,
  supplier text,
  purchase_date date,
  purchase_price numeric check (purchase_price >= 0),
  initial_weight numeric check (initial_weight >= 0),
  current_weight numeric check (current_weight >= 0),
  current_stage lot_stage_enum not null default 'PROCUREMENT',
  is_finalized boolean default false,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- STAGE LOGS (Immutable History)
create table stage_logs (
  id uuid default uuid_generate_v4() primary key,
  lot_id uuid references lots(id) not null,
  stage lot_stage_enum not null,
  sequence_number integer check (sequence_number between 1 and 6),
  entered_at timestamp with time zone default now(),
  exited_at timestamp with time zone,
  data jsonb default '{}'::jsonb,
  metrics jsonb default '{}'::jsonb,
  cost numeric default 0 check (cost >= 0),
  created_by uuid references auth.users(id),
  
  -- Prevent multiple active stages for the same lot
  -- This ensures only one row has exited_at IS NULL per lot_id
  constraint unique_active_stage unique (lot_id, exited_at) 
);

-- NOTE: The unique constraint 'unique (lot_id, exited_at)' works because NULL != NULL in SQL standard, 
-- but Postgres treats NULLs as distinct for UNIQUE unless specified otherwise. 
-- However, we want to ENFORCE only ONE null. 
-- A partial unique index is better for this specific "single active stage" rule in Postgres:
create unique index one_active_stage_per_lot_idx on stage_logs (lot_id) where exited_at is null;


-- PROCESSING COSTS (Auxiliary)
create table processing_costs (
  id uuid default uuid_generate_v4() primary key,
  lot_id uuid references lots(id) not null,
  stage lot_stage_enum not null,
  cost_type text not null,
  amount numeric not null check (amount >= 0),
  recorded_at timestamp with time zone default now()
);

-- LOT ASSETS (Media)
create table lot_assets (
  id uuid default uuid_generate_v4() primary key,
  lot_id uuid references lots(id) not null,
  stage lot_stage_enum,
  file_path text not null,
  file_type text,
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamp with time zone default now()
);

-- 3. VIEWS

-- Financial Snapshot
create or replace view lot_financial_snapshot as
select 
  l.id,
  l.lot_code,
  l.current_stage,
  l.initial_weight,
  l.current_weight,
  (l.initial_weight - l.current_weight) as total_loss,
  (
    l.purchase_price + 
    coalesce((select sum(cost) from stage_logs where lot_id = l.id), 0) +
    coalesce((select sum(amount) from processing_costs where lot_id = l.id), 0)
  ) as total_cost
from lots l;

-- Export View (Reporting)
create or replace view lot_export_view as
select
  l.id,
  l.lot_code,
  l.supplier,
  l.purchase_date,
  l.current_stage,
  l.is_finalized,
  l.initial_weight,
  l.current_weight,
  snap.total_cost,
  snap.total_loss,
  -- Get Sale Data from the SELL_READY log if it exists
  (select data->>'sold_price' from stage_logs where lot_id = l.id and stage = 'SELL_READY') as sold_price,
  (select data->>'buyer' from stage_logs where lot_id = l.id and stage = 'SELL_READY') as buyer
from lots l
join lot_financial_snapshot snap on snap.id = l.id;


-- 4. RLS POLICIES (Row Level Security)

-- Enable RLS
alter table profiles enable row level security;
alter table system_config enable row level security;
alter table lots enable row level security;
alter table stage_logs enable row level security;
alter table processing_costs enable row level security;
alter table lot_assets enable row level security;

-- Basic Policies (To be refined with specific Roles later)
-- For now, allow Authenticated Users to View/Create/Update where appropriate.
-- STAGE LOGS are APPEND ONLY (No Delete, No Update except exited_at via function - handled in app logic, but DB policy can be strict)

-- Profiles: Users can read all, update own
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Config: Read only for most, Admin write (skip admin check for init)
create policy "Config viewable by authenticated" on system_config for select to authenticated using (true);

-- Lots: Authenticated full access (Subject to app logic)
create policy "Authenticated have full access to lots" on lots for all to authenticated using (true);

-- Logs: Authenticated insert/select. Specially restrict UPDATES/DELETES.
create policy "Authenticated can read logs" on stage_logs for select to authenticated using (true);
create policy "Authenticated can insert logs" on stage_logs for insert to authenticated with check (true);
-- We allow update ONLY for setting exited_at (Logic handled in Server Action, but RLS allows it)
create policy "Authenticated can update logs" on stage_logs for update to authenticated using (true); 

-- Costs & Assets
create policy "Authenticated full access costs" on processing_costs for all to authenticated using (true);
create policy "Authenticated full access assets" on lot_assets for all to authenticated using (true);


-- 5. INITIAL DATA (System Config)
insert into system_config (key, value) values 
('colors', '["BLUE", "SILK", "GEUDA"]'::jsonb),
('clarity_levels', '["HIGH", "MEDIUM", "LOW"]'::jsonb);
