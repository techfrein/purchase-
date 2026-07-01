# Improvement Roadmap — Hospital Purchase Portal

A working review of where the app stands and what would move it from a strong prototype
toward a production, sellable hospital procurement product. Organised by **UI/design**,
**flows/UX**, and **information architecture**, with a prioritised punch list at the end.

> Scope note: this doc is about UI, design, and flows. The pricing/fetching engine
> (`lib/gemini.ts`, `lib/scraping.ts`) is covered separately; only its *surfacing* in the
> UI is discussed here.

---

## 0. Snapshot of what exists today

**Pages:** Dashboard, Purchases (requests + tickets tabs), New Request, Vegetables,
Excel Import, Reports, and Admin (Approvals, Users, Reference Catalog, Settings, Audit).

**Roles:** STAFF, PURCHASE, ADMIN, OWNER.

**Core flow:** Staff/Purchase create a request and pick options → Admin reviews/approves →
Owner gives final approval, assigns a purchaser + PDF recipients → a Ticket is created.

**Strengths already in place:** clean card-based visual language, a real sidebar with
role-gated admin section + pending-approval badge, per-unit pricing emphasis, a Smart
Analyser, a compare panel with feature/spec rows, mobile drawer nav.

---

## 1. UI / Design

### 1.1 Design system & consistency
- **Establish design tokens.** Spacing, radius (lots of `rounded-2xl`/`rounded-3xl` mixed),
  shadow, and color usage are ad-hoc per page. Define a small token set (e.g. `--radius-card`,
  `--radius-control`, semantic colors) so every surface looks intentional and theming for a
  new hospital is a one-file change.
- **Status color is duplicated everywhere.** The `PENDING_ADMIN/PENDING_OWNER/APPROVED/REJECTED`
  → color mapping is re-implemented inline (purchases list, dashboard, detail). Extract a
  single `<StatusBadge status=… />` and one source of truth for status → {label, color, icon}.
- **Tile accent enum is fragile.** `StatCard` accepts only a fixed accent set (we hit a build
  error on `"emerald"`). Make accents a typed token map so adding one is safe.
- **Typography scale.** Headings jump (4xl on New Request, 3xl on Purchases, 3xl on Vegetables).
  Pick 2–3 page-title sizes and apply consistently.

### 1.2 Components worth adding
- **Empty states with action.** Lists show plain "No requests yet." Add an illustration +
  primary CTA ("Create your first request") — important for first-run and demos to buyers.
- **Skeleton loaders** for the dashboard and lists (the New Request page already has a nice
  stepped `AnalysingLoader`; bring that polish to data-fetching pages).
- **Toast/notification system.** Right now errors are inline red boxes and success is a
  redirect. A consistent toast for save/approve/reject confirms actions and reduces "did it
  work?" anxiety in approval flows.
- **Confirmation dialogs** for destructive/irreversible actions (Owner approve → creates a
  ticket; Admin reject; Clear Data). Currently these fire on a single click.
- **Reusable data table** for Reports/Audit/Users (sortable headers, sticky header, zebra),
  replacing the bespoke `<table>`s.

### 1.3 Product card & results page (New Request)
- Per-unit price is now the hero — good. Next:
  - Show **price provenance** as a small chip on each card (Live Shopping / B2B / Past PO /
    Estimate). Buyers of bulk need to trust the number's source.
  - Show **rating/delivery** that Serper returns (already parsed into `description`) as
    discrete chips rather than buried in a sentence.
  - **Sort/filter controls** above the grid: by per-unit price, by source type, "hide estimates".
- **Compare** is hidden until you tick boxes; add a sticky "Compare (n)" bar so users discover
  it, and allow comparing directly from the grid without scrolling to the panel.
- The Smart Analyser card is strong — pin it to the top and let it **deep-link to the
  recommended card** (scroll + highlight) on click.

### 1.4 Accessibility & polish
- Audit color contrast on the muted `text-slate-400/500` labels (some fail WCAG AA on white).
- Ensure every icon-only button has an `aria-label` (sidebar logout has it; others don't).
- Keyboard: the New Request flow is mouse-centric. Make compare checkboxes, select, and the
  results grid keyboard-navigable; add focus rings.
- Respect `prefers-reduced-motion` for the ping/pulse animations.

---

## 2. Flows / UX

### 2.1 Approval workflow (the heart of the product)
- **Visualise the pipeline.** A horizontal stepper (Requested → Admin → Owner → Ticket) on the
  request detail page so everyone sees where it is and what's next. Today status is a colored
  badge only.
- **In-app notifications + email** when a request needs *your* action (Admin when PENDING_ADMIN,
  Owner when PENDING_OWNER, requester on decision). This is the #1 thing that makes a workflow
  tool actually get used instead of WhatsApp.
- **Comments / clarification thread** on a request. There's a `support` route but no
  back-and-forth UI. Procurement always needs "can you justify the quantity?" exchanges.
- **Budget guardrails.** Let Owner/Admin set per-department or per-category budget caps; flag
  requests that exceed them and require an extra approval. Hospitals buy against budgets.
- **Delegation / out-of-office.** An approver should be able to delegate while away so the
  pipeline doesn't stall.
- **Bulk approve/reject** from the Purchases list for admins drowning in requests.

### 2.2 Request creation
- **Multi-line requests (indents).** A real hospital indent has many line items. Today New
  Request is one product at a time; Excel Import exists but is separate. Merge into a "cart":
  add several products to one request, each with its own options/qty, submit as one indent.
- **Save as draft** + **duplicate a past request** (reorder). Reordering consumables is the
  most common action and should be one click.
- **Quantity + unit validation tied to the product** (we fixed the sticky-1 bug; next, default
  the unit from the detected product type — gloves→box, oil→litre).
- **Reason templates / required justification** per category (capital items need more).

### 2.3 Tickets & fulfilment (currently a dead end after approval)
- After a Ticket is created, there's no lifecycle. Add states: **Ordered → Received → Closed**,
  with PO number, vendor, expected/actual delivery date, and partial-receipt handling.
- **Goods-receipt step**: purchaser marks received qty, attaches invoice; this closes the loop
  and feeds spend reporting with *actuals* not estimates.
- **Vendor entity.** There's no vendor model. Bulk procurement is vendor-centric — add vendors
  (name, GSTIN, contact, rating, category) and tie tickets/quotes to them.

### 2.4 Inventory context (what makes it "inventory management", not just purchasing)
- The app is named for inventory but has none. Add **stock levels, reorder points, consumption
  rate**, and surface "you have ~12 days of gloves left → reorder" prompts that pre-fill a
  request. This is the difference between a buying tool and an inventory system.

### 2.5 Onboarding & multi-tenant
- **First-run wizard**: hospital name/logo, departments, roles, seed the reference catalog,
  set API keys. Today Settings is a flat form.
- **Multi-tenancy** (if selling to multiple hospitals): org scoping + row-level security so
  one deployment serves many sites; per-org branding.

---

## 3. Information architecture & data

- **Persist fetched prices → price history.** Every search result should be stored
  (product, vendor, unit_price, pack_size, source, fetched_at). Enables trend charts,
  "you paid ₹X last quarter", anomaly flags, and offline operation. `reference_prices` is a
  starting point.
- **GST / landed cost.** Show tax + freight → landed cost as the comparison number, not the
  scraped sticker. Non-negotiable for Indian hospital procurement.
- **Reports depth.** Current reports are spend summaries. Add: spend by department/category/
  vendor over time, request cycle-time (submitted→approved), savings vs median market,
  top reordered items. These are the dashboards a procurement head actually buys.
- **Audit completeness.** Audit log exists — ensure every state transition, price decision,
  and settings change is captured with before/after, for compliance.

---

## 4. Trust, compliance, sellability

- **Price provenance & confidence labels** everywhere a price appears (see 1.3).
- **GeM / government e-procurement alignment** — many Indian hospitals must justify against
  GeM rates; show a GeM reference where possible.
- **Data residency, backups, RBAC review, SLA** — table stakes for a hospital IT procurement.
- **Scraping ToS** — already gated via an allowlist in `lib/scraping.ts`; keep that reviewed
  and documented for buyers' legal teams.
- **PDF/PO branding** — hospital logo, GSTIN, terms; export-ready.

---

## 5. Prioritised punch list

### Tier 1 — High impact, makes it credible to sell (do first)
1. In-app + email notifications on pending actions and decisions.
2. Request pipeline **stepper** on the detail page + a single `<StatusBadge>`.
3. **Multi-line requests** (one indent, many items) — merge New Request + Import mental model.
4. **Price provenance/confidence chips** on every option and ticket.
5. Persist **price history** + show "vs last paid / vs median".
6. Confirmation dialogs + toasts for approve/reject/clear.

### Tier 2 — Procurement depth
7. Vendor entity + GST/landed-cost.
8. Ticket lifecycle (Ordered→Received→Closed) + goods receipt.
9. Budget caps & exceed-flagging.
10. Reorder / duplicate past request; drafts.
11. Reports: cycle-time, spend-by-dimension, savings.

### Tier 3 — Platform & polish
12. Inventory/stock + reorder prompts.
13. First-run onboarding wizard; multi-tenancy + branding.
14. Design tokens, reusable table, skeletons, empty states.
15. Accessibility pass (contrast, keyboard, aria, reduced-motion).

### Quick wins (low effort, visible)
- Sticky "Compare (n)" bar + sort/filter on results.
- Smart Analyser → scroll-to-recommended.
- Empty states with CTAs.
- Default unit from detected product type.
- Toasts instead of inline-only errors.

---

*Living document — update as items ship.*
