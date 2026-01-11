-- Allow Anonymous (public) access for development testing
-- Run this in your Supabase SQL Editor

-- 1. Enable RLS (already enabled, but good to ensure)
alter table lots enable row level security;
alter table stage_logs enable row level security;

-- 2. Create Anon Policies
create policy "Enable access for anon users" on lots for all using (true) with check (true);
create policy "Enable access for anon users" on stage_logs for all using (true) with check (true);
create policy "Enable access for anon users" on processing_costs for all using (true) with check (true);
create policy "Enable access for anon users" on lot_assets for all using (true) with check (true);
create policy "Enable access for anon users" on system_config for all using (true) with check (true);

-- 3. Grant usage
grant usage on schema public to anon;
grant all on all tables in schema public to anon;
grant all on all sequences in schema public to anon;
