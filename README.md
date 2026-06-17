# Hospital Purchase Verification System

Detects inflated purchase bills by checking quoted prices against online stores and an
internal reference-price catalog, then routes every purchase through an admin approval
workflow with a full audit trail.

## Running

```bash
npm install
npm run build
npm start          # production, http://localhost:3000
# or: npm run dev  # development
```

Default accounts (change the passwords from Admin → Users after first login):

| Username   | Password      | Role                |
|------------|---------------|---------------------|
| `admin`    | `admin123`    | Administrator       |
| `staff`    | `staff123`    | Staff               |
| `purchase` | `purchase123` | Purchase Department |

**Roles**

- **Staff** and **Purchase Department** both raise purchase requests. Quoting a
  local vendor and price is optional — leave the price blank and it is recorded
  as *Needs Manual Review*.
- **Administrator** sees every request and the online price check, and is the
  only role that can approve or reject (rejection requires a note).

Data lives in `data/app.db` (SQLite, created and seeded automatically).

## How a purchase is verified

1. A purchase is entered via the **New Purchase** form or **Excel Import** (template downloadable in-app).
2. The price engine searches all enabled sources:
   - **Amazon.in / Flipkart** — best-effort scraping of public search pages (stores often block bots, so results are intermittent),
   - **Google Shopping via Serper.dev** — reliable live prices across Indian stores; paste a key from serper.dev in Admin → Settings to enable (low-cost: ~$0.30–1 per 1,000 queries, 2,500 free credits),
   - **Internal reference catalog** — admin-maintained benchmark prices, works offline (Admin → Reference Catalog).
3. Each listing found is classified against the entered product: **Same Product**, **Similar**, **Same Specification**, or **Alternative**. Accessory listings (covers, cartridges…) and price outliers are discarded.
4. The quoted price is compared with the best matching listing and the purchase is flagged:
   - **Better Price Available** (red) — quoted price exceeds the best online price by more than the tolerance (default 10%, configurable in Settings); potential savings are computed,
   - **Good Price** — within tolerance,
   - **Better Than Online** — cheaper than every listing found,
   - **Needs Manual Review** — no comparable listing found.
5. An **administrator** approves or rejects the purchase (rejection requires a note). Staff and purchase-department users can enter and re-check purchases but cannot decide them.

## Features

- Role-based access: Admin and Purchase Department employee accounts
- Dashboard with pending/flagged counts, spend and identified savings
- Purchase list with search and status/verdict filters
- Bulk entry via Excel with row-level validation errors
- Reports by category and by vendor (most-flagged first) + Excel export
- Audit log of every login, entry, price check, decision and settings change
- User management: create, deactivate, reset password

## Notes

- Prices are INR; comparison sites are the Indian storefronts.
- Direct scraping of Amazon/Flipkart is brittle and may violate store terms of service —
  for dependable live data use a Serper.dev key, and keep the reference catalog updated as
  the authoritative fallback.
# purchase-
