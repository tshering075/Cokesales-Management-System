-- Run once in Supabase SQL Editor if distributors never see approve/reject from the database.
-- Without this column, PostgREST drops `status` from UPDATE payloads and only `updated_at` changes.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

COMMENT ON COLUMN orders.status IS 'pending | sent | approved | rejected | canceled';
