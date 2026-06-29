# Supabase Migration - New Purchase Workflow (Gemini)

**Primary file to run:**

```
supabase/migrations/20240621_new_purchase_workflow.sql
```

## How to apply

1. Open the file `supabase/migrations/20240621_new_purchase_workflow.sql` directly from your project
2. Copy its full content
3. Paste into Supabase **SQL Editor** → Run

## Adding the Gemini API Key (very important)

The correct environment variable name is **`GEMINI_API_KEY`** (not `GEMINI_KEY`).

### Recommended way:

Edit your `.env.local` file and add:

```env
GEMINI_API_KEY=AIzaSyYourActualKeyHere
```

Then **restart** your dev server (`npm run dev`).

### Alternative:

You can also set it through the web UI:
- Login as Owner or Admin
- Go to **Admin → Settings**
- Paste the key in the "Gemini API Key" field

The app will prefer the `.env` variable if both are set.

The migration file is:
- Fully commented
- Idempotent (safe to run multiple times)
- Includes all new tables, indexes, triggers, and settings

## What it does

- Creates `purchase_requests` table (the main form + Gemini selections)
- Creates `purchase_tickets` table (final approved records with purchaser + PDF recipients)
- Adds helper columns to the old `purchases` table
- Sets up `gemini_key` in settings (UI fallback). Preferred way is `GEMINI_API_KEY` in `.env.local`.
- Clears legacy `serper_key`
- Creates proper indexes and the `updated_at` trigger

## After running the migration

```bash
npm run build
# then restart your dev server
```

## Verification queries (optional)

```sql
-- Check new tables exist
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('purchase_requests', 'purchase_tickets');

-- Check settings
SELECT key, value FROM settings 
WHERE key IN ('gemini_key', 'serper_key');

-- Count current requests / tickets
SELECT 
  (SELECT count(*) FROM purchase_requests) as requests,
  (SELECT count(*) FROM purchase_tickets) as tickets;
```

## Notes

- You should have already deleted old rows from `purchases` and `price_listings` (as per your previous request).
- The old `purchases` table is kept for backward compatibility but is no longer the primary flow.
- All new activity goes through the Gemini-powered request flow.

This file was created specifically so you have one clean thing to copy-paste without chat formatting issues.