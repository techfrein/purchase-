-- ============================================================================
-- SUPABASE MIGRATION: New Purchase Workflow (Gemini + Multi-role approvals)
-- Date: 2026-06-21
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard → SQL Editor → New query
-- 2. Copy and paste the ENTIRE contents of this file
-- 3. Click "Run" or press Cmd/Ctrl + Enter
-- 4. It is safe to run multiple times (uses IF NOT EXISTS / IF EXISTS)
--
-- This migration:
-- - Sets up purchase_requests (Staff/Purchase submit + select Gemini options)
-- - Sets up purchase_tickets (final Owner-approved with purchaser + recipients)
-- - Adds compatibility columns to old purchases table
-- - Configures settings for Gemini (replaces Serper)
-- - Creates necessary indexes and triggers
--
-- AFTER RUNNING:
-- - Restart your Next.js app (or redeploy)
-- - Old purchase data should already be deleted by you
-- - New flow is active: /purchases/new → Gemini cards → approvals
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ensure the updated_at helper function exists (used by triggers)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 2. New core tables for the workflow
-- ---------------------------------------------------------------------------

-- Purchase Requests (submitted by STAFF or PURCHASE, reviewed by ADMIN then OWNER)
CREATE TABLE IF NOT EXISTS purchase_requests (
  id                    BIGSERIAL PRIMARY KEY,
  ref_no                TEXT NOT NULL UNIQUE,
  requested_by          BIGINT NOT NULL REFERENCES users(id),
  product_heading       TEXT NOT NULL,
  quantity              NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit                  TEXT NOT NULL DEFAULT 'unit',
  reason                TEXT NOT NULL DEFAULT '',
  selected_options      JSONB NOT NULL DEFAULT '[]'::jsonb,           -- Gemini results + user selections + reasons
  status                TEXT NOT NULL DEFAULT 'PENDING_ADMIN'
                        CHECK (status IN ('PENDING_ADMIN', 'PENDING_OWNER', 'APPROVED', 'REJECTED')),
  admin_note            TEXT NOT NULL DEFAULT '',
  admin_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_decided_by      BIGINT REFERENCES users(id),
  admin_decided_at      TIMESTAMPTZ,
  owner_note            TEXT NOT NULL DEFAULT '',
  owner_chosen_option   JSONB,                                        -- The final chosen listing
  owner_decided_by      BIGINT REFERENCES users(id),
  owner_decided_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Purchase Tickets (created only when OWNER approves a specific listing)
CREATE TABLE IF NOT EXISTS purchase_tickets (
  id               BIGSERIAL PRIMARY KEY,
  ref_no           TEXT NOT NULL UNIQUE,
  request_id       BIGINT REFERENCES purchase_requests(id),
  product_title    TEXT NOT NULL,
  source           TEXT NOT NULL,
  unit_price       NUMERIC(12, 2) NOT NULL,
  quantity         NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit             TEXT NOT NULL DEFAULT 'unit',
  chosen_url       TEXT,
  requested_by     BIGINT REFERENCES users(id),
  requested_reason TEXT,
  approved_by      BIGINT REFERENCES users(id),     -- Always OWNER
  approved_at      TIMESTAMPTZ,
  purchaser_id     BIGINT REFERENCES users(id),     -- Who is responsible for buying/acquiring
  recipient_ids    BIGINT[] DEFAULT '{}',           -- Users who should receive the PDF
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. Indexes for performance
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pr_status         ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_pr_requested_by   ON purchase_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_pr_created        ON purchase_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pt_request        ON purchase_tickets(request_id);
CREATE INDEX IF NOT EXISTS idx_pt_purchaser      ON purchase_tickets(purchaser_id);
CREATE INDEX IF NOT EXISTS idx_pt_approved_at    ON purchase_tickets(approved_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS purchase_requests_updated_at ON purchase_requests;
CREATE TRIGGER purchase_requests_updated_at
  BEFORE UPDATE ON purchase_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Safe column additions to the old purchases table (for compatibility)
-- ---------------------------------------------------------------------------
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS request_id BIGINT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS ticket_id  BIGINT;

-- ---------------------------------------------------------------------------
-- 6. Settings: Gemini key + clean up legacy Serper settings
-- ---------------------------------------------------------------------------
-- Note on Gemini key:
-- • Recommended: Set GEMINI_API_KEY=your_key in .env.local (server-side, never exposed to browser)
-- • Fallback: You can also set it via the Admin → Settings UI (stored as "gemini_key" in DB)
--
-- The code checks ENV first, then DB setting.
INSERT INTO settings (key, value) VALUES ('gemini_key', '')
ON CONFLICT (key) DO NOTHING;

-- De-emphasize / clear old Serper key (new flow uses Gemini)
UPDATE settings SET value = '' WHERE key = 'serper_key';

-- Optional: keep these but they are no longer critical
INSERT INTO settings (key, value) VALUES ('scrape_enabled', '0') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Ensure other required settings exist
INSERT INTO settings (key, value) VALUES
  ('hospital_name',   'Varun Arjun Medical College'),
  ('tolerance_pct',   '10'),
  ('catalog_enabled', '1')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. (Optional) Clean up any remaining old price check data
--    Uncomment the next two lines if you still see old records
-- ---------------------------------------------------------------------------
-- DELETE FROM price_listings;
-- DELETE FROM purchases;

-- ============================================================================
-- END OF MIGRATION
-- After running, verify with:
--   SELECT * FROM purchase_requests LIMIT 1;
--   SELECT * FROM purchase_tickets LIMIT 1;
--   SELECT key, value FROM settings WHERE key IN ('gemini_key', 'serper_key');
-- ============================================================================