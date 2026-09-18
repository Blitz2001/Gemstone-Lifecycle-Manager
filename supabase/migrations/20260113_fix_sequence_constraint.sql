-- Migration: 20260113_fix_sequence_constraint.sql
-- Description: Fix restrictive sequence_number check constraint on stage_logs
-- The original schema checked (sequence_number between 1 and 6).
-- With CERTIFICATION (6), SELL_READY (7), and SOLD (8), sequence numbers up to 8+ are required.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Drop existing named check constraint if it exists
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'stage_logs'
          AND constraint_name = 'stage_logs_sequence_number_check'
    ) THEN
        ALTER TABLE public.stage_logs DROP CONSTRAINT stage_logs_sequence_number_check;
    END IF;

    -- 2. Drop any check constraint that references column sequence_number on table stage_logs
    -- (in case it was auto-named or created with a non-standard name)
    FOR r IN (
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'stage_logs'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%sequence_number%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.stage_logs DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;

    -- 3. Add the updated check constraint accommodating all pipeline stages (1 through 20)
    ALTER TABLE public.stage_logs
        ADD CONSTRAINT stage_logs_sequence_number_check
        CHECK (sequence_number >= 1 AND sequence_number <= 20);

END $$;
