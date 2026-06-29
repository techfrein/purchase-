-- Varun Arjun Medical College — Purchase Verification System
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New query)

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS users (
  id              BIGSERIAL PRIMARY KEY,
  username        TEXT NOT NULL UNIQUE,
  password_hash   TEXT NOT NULL DEFAULT '',
  name            TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'STAFF', 'PURCHASE')),
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  approval_status TEXT NOT NULL DEFAULT 'APPROVED'
                    CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  decided_by      BIGINT REFERENCES users(id),
  decided_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS purchases (
  id                  BIGSERIAL PRIMARY KEY,
  ref_no              TEXT NOT NULL UNIQUE,
  product_name        TEXT NOT NULL,
  category            TEXT NOT NULL,
  brand               TEXT NOT NULL DEFAULT '',
  model               TEXT NOT NULL DEFAULT '',
  specs               TEXT NOT NULL DEFAULT '',
  quantity            NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit                TEXT NOT NULL DEFAULT 'unit',
  unit_price          NUMERIC(12, 2),
  vendor_name         TEXT NOT NULL DEFAULT '',
  vendor_contact      TEXT NOT NULL DEFAULT '',
  invoice_no          TEXT NOT NULL DEFAULT '',
  invoice_date        TEXT NOT NULL DEFAULT '',
  notes               TEXT NOT NULL DEFAULT '',
  source              TEXT NOT NULL DEFAULT 'FORM' CHECK (source IN ('FORM', 'EXCEL')),
  status              TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
                        CHECK (status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
  verdict             TEXT NOT NULL DEFAULT 'UNCHECKED'
                        CHECK (verdict IN (
                          'UNCHECKED', 'BETTER_PRICE_AVAILABLE', 'GOOD_PRICE',
                          'BETTER_THAN_ONLINE', 'NEEDS_REVIEW'
                        )),
  verdict_basis       TEXT NOT NULL DEFAULT '',
  best_online_price   NUMERIC(12, 2),
  best_online_title   TEXT,
  best_online_source  TEXT,
  best_online_url     TEXT,
  potential_saving    NUMERIC(12, 2),
  checked_at          TIMESTAMPTZ,
  created_by          BIGINT NOT NULL REFERENCES users(id),
  decided_by          BIGINT REFERENCES users(id),
  decided_at          TIMESTAMPTZ,
  decision_note       TEXT NOT NULL DEFAULT '',
  -- The online listing the approver selected as the benchmark when approving.
  -- The vendor's unit_price is intentionally left unchanged.
  approved_source     TEXT,
  approved_price      NUMERIC(12, 2),
  approved_url        TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migration for existing databases (safe to re-run):
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS approved_source TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS approved_price  NUMERIC(12, 2);
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS approved_url    TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS unit            TEXT NOT NULL DEFAULT 'unit';
-- Allow fractional quantities for measures like litres / kilograms.
ALTER TABLE purchases ALTER COLUMN quantity TYPE NUMERIC(12, 3);

CREATE TABLE IF NOT EXISTS price_listings (
  id           BIGSERIAL PRIMARY KEY,
  purchase_id  BIGINT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  source       TEXT NOT NULL,
  title        TEXT NOT NULL,
  price        NUMERIC(12, 2) NOT NULL,
  url          TEXT,
  match_type   TEXT NOT NULL CHECK (match_type IN (
                 'SAME_PRODUCT', 'SIMILAR', 'SAME_SPEC', 'ALTERNATIVE'
               )),
  match_score  NUMERIC(5, 4) NOT NULL,
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reference_prices (
  id            BIGSERIAL PRIMARY KEY,
  product_name  TEXT NOT NULL,
  category      TEXT NOT NULL,
  brand         TEXT NOT NULL DEFAULT '',
  model         TEXT NOT NULL DEFAULT '',
  price         NUMERIC(12, 2) NOT NULL,
  source        TEXT NOT NULL DEFAULT 'Internal Catalog',
  url           TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL DEFAULT '',
  entity_id   TEXT NOT NULL DEFAULT '',
  detail      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_purchases_status    ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_verdict   ON purchases(verdict);
CREATE INDEX IF NOT EXISTS idx_purchases_created   ON purchases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_purchases_creator   ON purchases(created_by);
CREATE INDEX IF NOT EXISTS idx_purchases_category  ON purchases(category);
CREATE INDEX IF NOT EXISTS idx_listings_purchase   ON price_listings(purchase_id);
CREATE INDEX IF NOT EXISTS idx_audit_created       ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_approval      ON users(approval_status);
CREATE INDEX IF NOT EXISTS idx_sessions_user       ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires    ON sessions(expires_at);

-- ---------------------------------------------------------------------------
-- Auto-update updated_at on purchases
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS purchases_updated_at ON purchases;
CREATE TRIGGER purchases_updated_at
  BEFORE UPDATE ON purchases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Default settings
-- ---------------------------------------------------------------------------

INSERT INTO settings (key, value) VALUES
  ('hospital_name',   'Varun Arjun Medical College'),
  ('tolerance_pct',   '10'),
  ('serper_key',      ''),
  ('gemini_key',      ''),
  ('scrape_enabled',  '0'),
  ('catalog_enabled', '1'),
  ('emandi_enabled',  '1'),
  ('emandi_market',   'Shahjahanpur'),
  ('emandi_state',    'Uttar Pradesh'),
  ('purchase_categories', '["Television","Laptop","Desktop Computer","Smartphone","Tablet","Monitor","Printer","Medical Equipment","Hospital Furniture","Air Conditioner","Refrigerator","Washing Machine","Water Purifier","UPS","Networking","Security","Accessories","Other"]')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Default users (passwords: owner123, admin123, staff123, purchase123)
-- Hashes generated with bcrypt cost 10 — change after first login.
-- ---------------------------------------------------------------------------

INSERT INTO users (username, password_hash, name, role) VALUES
  ('owner',    '$2b$10$hIpbL/xnHHa1LsE/Tu5cY.bUsZH55iTXs0/c7GgGlI9sHR10PKOL6', 'Owner',            'OWNER'),
  ('admin',    '$2b$10$988U.o7Wcd.ewhsNqa8p1eslbktGjd/dT6QA3xxQGat6BsXin5fi.', 'Administrator',    'ADMIN'),
  ('staff',    '$2b$10$q8CI57J09EH/SslHwNGoG.9EeEqKKS9RmhcFAuAjH1goIEoEzDsly', 'Store Staff',      'STAFF'),
  ('purchase', '$2b$10$vghwKYtEO2DYJgUwB6itv.xMzF5bsSrbT4CtadOVt2AqAufDE.QN6', 'Purchase Officer', 'PURCHASE')
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Row Level Security (optional — enable when wiring Supabase Auth)
-- ---------------------------------------------------------------------------

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- (Add policies based on your auth strategy when you connect the API keys)

-- ============================================================================
-- NEW PURCHASE WORKFLOW (added 2024-06)
-- See supabase/migrations/20240621_new_purchase_workflow.sql for a clean
-- migration you can run in the SQL editor on an existing database.
-- The definitions below are here so a full schema reset also includes them.
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_requests (
  id                    BIGSERIAL PRIMARY KEY,
  ref_no                TEXT NOT NULL UNIQUE,
  requested_by          BIGINT NOT NULL REFERENCES users(id),
  product_heading       TEXT NOT NULL,
  quantity              NUMERIC(12, 3) NOT NULL DEFAULT 1,
  unit                  TEXT NOT NULL DEFAULT 'unit',
  reason                TEXT NOT NULL DEFAULT '',
  selected_options      JSONB NOT NULL DEFAULT '[]'::jsonb,
  status                TEXT NOT NULL DEFAULT 'PENDING_ADMIN'
                        CHECK (status IN ('PENDING_ADMIN', 'PENDING_OWNER', 'APPROVED', 'REJECTED')),
  admin_note            TEXT NOT NULL DEFAULT '',
  admin_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  admin_decided_by      BIGINT REFERENCES users(id),
  admin_decided_at      TIMESTAMPTZ,
  owner_note            TEXT NOT NULL DEFAULT '',
  owner_chosen_option   JSONB,
  owner_decided_by      BIGINT REFERENCES users(id),
  owner_decided_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  approved_by      BIGINT REFERENCES users(id),
  approved_at      TIMESTAMPTZ,
  purchaser_id     BIGINT REFERENCES users(id),   -- who is responsible to acquire
  recipient_ids    BIGINT[] DEFAULT '{}',          -- users to receive the PDF ticket
  notes            TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pr_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_pr_requested_by ON purchase_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_pr_created ON purchase_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pt_request ON purchase_tickets(request_id);
CREATE INDEX IF NOT EXISTS idx_pt_purchaser ON purchase_tickets(purchaser_id);

-- updated_at trigger for requests
DROP TRIGGER IF EXISTS purchase_requests_updated_at ON purchase_requests;
CREATE TRIGGER purchase_requests_updated_at
  BEFORE UPDATE ON purchase_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Safe column additions for old purchases table (no breaking)
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS request_id BIGINT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS ticket_id BIGINT;