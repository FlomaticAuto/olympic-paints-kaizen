# Supabase Schema — olympic-paints-backend

**Project ID:** `bpblxplotublqsecdkcb`  
**Region:** eu-north-1  
**Postgres:** 17.6.1

The database is a single-project hub serving several distinct sub-systems, each namespaced by table prefix.

---

## Sub-system overview

| Prefix | Sub-system | Tables | Purpose |
|--------|-----------|--------|---------|
| `vd_` | Volume Dashboard | 7 | Customer volume tracking, tier pricing, rebate agreements |
| `store_visit_` | Store Visits | 3 | Merchandiser visit bookings and field capture |
| `stores` | Store Directory | 1 | Master list of 511 retail stores |
| `voice_order_` | Voice Ordering | 3 | WhatsApp-driven order intake via AI (Phase 2) |
| `haven_` | Haven HR | 4 | Offsite declarations and approvals |
| `form_` | Dynamic Forms | 3 | Schema-driven forms and submissions |
| `ci_` | Competitor Intel | 2 | CI dispatch and WhatsApp batch logs |
| `whatsapp_` | WhatsApp Logs | 2 | Inbound/outbound WhatsApp audit trail |

---

## Volume Dashboard (`vd_*`)

This sub-system powers the volume-incentive pricing dashboard. Products have three tiers (T1/T2/T3); customers unlock lower tiers by hitting 3-month volume thresholds.

### `vd_products`
18 product sub-variants. Each has a `vol_key` that links it to one of 12 client-volume tracking columns in the source workbook.

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | Auto-increment |
| `vol_key` | text | Shared key across `vd_volume_actuals` and `vd_monthly_targets` |
| `category` | text | Product category grouping |
| `name` | text UNIQUE | Display name |
| `created_at` | timestamptz | |

### `vd_tier_pricing`
54 rows — T1/T2/T3 unit prices and volume thresholds per product. Source: `Volume Price Report.xlsx`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `product_id` | integer FK → `vd_products.id` | |
| `tier` | smallint | CHECK: 1, 2, or 3 |
| `unit_price` | numeric | Price at this tier |
| `threshold_3m` | integer | 3-month units needed to qualify |
| `monthly_target` | integer | Implied monthly run-rate |
| `saving_vs_t1_pct` | numeric | % saving vs T1 (nullable) |

### `vd_customers`
425 active customer accounts from the Client Volumes sheet.

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `account_no` | text UNIQUE | Customer reference code |
| `name` | text | |
| `rep_code` | text | Sales rep identifier |
| `region` | text | nullable |
| `created_at` | timestamptz | |

### `vd_volume_actuals`
6 666 rows — per-customer, per-product rolling 3-month volumes. Seeded from workbook; daily refresh planned for Phase 2.

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `customer_id` | integer FK → `vd_customers.id` | |
| `vol_key` | text | Matches `vd_products.vol_key` |
| `snapshot_date` | date | Date of this reading |
| `units_3m` | integer | Rolling 3-month unit count |
| `last_invoice_price` | numeric | Most recent invoice price |

### `vd_monthly_targets`
168 rows — overall unit targets per product per month. Source: `Quantity Targets.xlsx` (Mar 2025 – Apr 2026).

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `vol_key` | text | Matches `vd_products.vol_key` |
| `year_month` | date | First day of the target month |
| `target_units` | integer | |

### `vd_rebate_agreements`
Volume-target rebate deals between reps and customers. Entry via Phase 4 dashboard. Currently empty.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `customer_id` | integer FK → `vd_customers.id` | |
| `vol_key` | text | Target product |
| `rep_code` | text | |
| `target_volume` | integer | Units committed |
| `period_months` | smallint | CHECK: 3, 6, or 8 |
| `start_date` / `end_date` | date | Agreement window |
| `agreed_price` | numeric | Negotiated unit price |
| `rebate_type` | text | CHECK: `per_unit` or `fixed` |
| `rebate_amount` | numeric | nullable |
| `status` | text | CHECK: `active`, `achieved`, `missed`, `cancelled` |

### `vd_rebate_progress`
Daily pace snapshots per rebate agreement. Written by daily ingest job (Phase 2). Currently empty.

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `agreement_id` | uuid FK → `vd_rebate_agreements.id` | |
| `snapshot_date` | date | |
| `units_to_date` | integer | Cumulative units so far |
| `projected_units` | integer | Forecast to end of period |
| `pace_status` | text | CHECK: `on_pace`, `behind`, `at_risk`, `achieved`, `missed` |

---

## Store Visits

### `stores`
511 retail stores — master directory used by visit bookings and voice ordering.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `name` | text | |
| `code` | text UNIQUE | Short store code |
| `address` | text | |
| `town` / `area` | text | |
| `rep` | text | Assigned rep |
| `phone` | text | |
| `dlref` | text | Delivery reference |
| `curef` | text | Customer reference (links to voice ordering) |

### `store_visit_bookings`
104 planned merchandiser visits.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `report_ref` | text | Reference number |
| `store_id` | uuid FK → `stores.id` | nullable |
| `store_name` / `store_code` / `store_address` | text | Denormalized at booking time |
| `address_source` | text | CHECK: `database` or `manual` |
| `booked_by` | text | |
| `purpose` | text | |
| `tasks` | text[] | Array of task strings |
| `merchandiser` | text | |
| `manager_name` | text | |
| `visit_date` | date | |
| `visit_time` | text | |
| `booking_status` | text | Default: `Logged` |
| `invite_sent` | boolean | Default: false |

### `store_visit_captures`
4 completed visit reports with detailed merchandising data.

Key fields include stock checks (FIFO, floor sufficiency), merchandising item counts (floor vinyls, colour charts, shelf wobblers, pricing boards), photo arrays (store front, stock before/after, chart before/after), customer satisfaction ratings (`Not Satisfied` / `Somewhat Satisfied` / `Satisfied`) across 5 dimensions, and overall store condition (`Poor` / `Fair` / `Good` / `Excellent`).

---

## Voice Ordering (`voice_order_*`)

WhatsApp-driven order intake. Customers speak or type an order; the system resolves products and prices.

### `voice_order_customers`
604 customers with `curef` as primary key (matches `stores.curef`).

| Column | Type |
|--------|------|
| `curef` | text PK |
| `customer_name` | text |
| `rep_name` | text |
| `billing_city` | text |
| `search_text` | text (for fuzzy lookup) |

### `voice_order_prices`
16 306 rows — effective price per customer per price category (`pricecat`).

| Column | Type |
|--------|------|
| `id` | integer PK |
| `curef` | text |
| `pricecat` | text |
| `pricecat_lower` | text (normalised) |
| `effective_price` | numeric |

### `voice_order_sessions`
Stateful session tracker per sender phone number. Currently empty.

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer PK | |
| `sender_phone` | text | |
| `rep_id` | text | |
| `state` | text | Conversation state machine |
| `raw_transcript` | text | |
| `parsed_order` | jsonb | Structured order output |
| `clarification_ctx` | jsonb | Context for follow-up questions |

---

## Haven HR (`haven_*`)

### `haven_employees`
102 employees from Olympic Paints and Primeserve.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | Employee code |
| `full_name` | text | |
| `department` | text | |
| `employer` | text | CHECK: `Olympic Paints` or `Primeserve` |
| `active` | boolean | Default: true |

### `haven_dept_approvers`
8 department approvers (keyed by department name).

| Column | Type |
|--------|------|
| `department` | text PK |
| `approver_name` | text |
| `approver_email` | text |
| `approver_wa` | text (WhatsApp number) |

### `haven_offsite_declarations`
Staff submit these before field visits, overnight stays, or delivery runs.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `employee_id` / `employee_name` | text | |
| `department` / `employer` | text | |
| `activity_type` | text | CHECK: `Overnight Stay`, `Field Visit`, `Delivery Run`, `Training`, `Other` |
| `date_from` / `date_to` | date | |
| `departure_time` / `return_expected` | time | |
| `location` / `purpose` | text | |
| `approver_email` | text | |
| `approval_token` | uuid | Used in approval email link |
| `status` | text | CHECK: `pending`, `approved`, `rejected`, `returned` |
| `return_actual` | timestamptz | Recorded on check-out |

### `haven_offsite_approvals`
One row per approval decision on a declaration.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `declaration_id` | uuid FK → `haven_offsite_declarations.id` | |
| `approver_name` | text | |
| `decision` | text | CHECK: `approved` or `rejected` |
| `notes` | text | |
| `decided_at` | timestamptz | |

---

## Dynamic Forms (`form_*`)

Schema-driven form engine. The form structure is stored as JSONB; submissions reference the form.

### `form_schemas`
26 form definitions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `title` | text | |
| `schema` | jsonb | Field definitions |
| `created_by` | text | |
| `active_from` / `active_until` | timestamptz | Validity window |
| `is_archived` | boolean | |

### `form_respondents`
7 rows — tracks who has submitted a given form.

| Column | Type |
|--------|------|
| `id` | uuid PK |
| `form_id` | uuid FK → `form_schemas.id` |
| `email` | text |
| `submitted_at` | timestamptz |

### `form_submissions`
86 submission records with free-form JSONB data payload.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | |
| `form_id` | uuid FK → `form_schemas.id` | |
| `submitted_by` | text | |
| `data` | jsonb | Submission answers |
| `metadata` | jsonb | Extra context (nullable) |

---

## Competitor Intelligence (`ci_*`)

### `ci_dispatch_log`
365 records tracking when CI forms were dispatched per rep.

| Column | Type |
|--------|------|
| `id` | bigint PK |
| `rep_code` | text |
| `form_id` | uuid |
| `sent_at` | date |
| `kind` | text |

### `ci_whatsapp_batch`
38 batched WhatsApp CI sends, with competitor, category, and short URL.

| Column | Type |
|--------|------|
| `id` | bigint PK |
| `rep_code` | text |
| `form_id` | uuid |
| `competitor` | text |
| `category` | text |
| `short_url` | text |
| `batched_at` / `sent_at` | date / timestamptz |
| `batch_slot` | integer |

---

## WhatsApp Logs (`whatsapp_*`)

### `whatsapp_audit_log`
188 outbound message attempts via Make scenario 9301106. One row per send attempt; updated in-place to `sent`/`failed`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint IDENTITY PK | |
| `sent_at` | timestamptz | |
| `recipient` | text | |
| `message_type` | text | |
| `body` | text | |
| `image_url` | text | |
| `wa_message_id` | text | |
| `status` | text | Default: `sent` |
| `error` | text | |
| `source` | text | |
| `request_id` | text | Make execution id |

### `whatsapp_inbound_log`
12 inbound messages, tagged by detected content type.

| Column | Type |
|--------|------|
| `id` | bigint IDENTITY PK |
| `received_at` | timestamptz |
| `sender_phone` | text |
| `rep_name` / `rep_id` / `rep_region` | text |
| `message_type` | text (default: `text`) |
| `message_body` | text |
| `detected_tags` | text |
| `wa_message_id` | text |

---

## RLS Status

> **Security advisory:** 17 tables have Row Level Security disabled. These tables are fully exposed to any client with the anon key.

| Status | Tables |
|--------|--------|
| RLS **enabled** | `stores`, `store_visit_bookings`, `haven_employees`, `haven_dept_approvers`, `haven_offsite_declarations`, `haven_offsite_approvals`, `whatsapp_inbound_log` |
| RLS **disabled** | `form_schemas`, `form_respondents`, `form_submissions`, `ci_dispatch_log`, `ci_whatsapp_batch`, `voice_order_customers`, `voice_order_prices`, `voice_order_sessions`, `whatsapp_audit_log`, `store_visit_captures`, `vd_products`, `vd_tier_pricing`, `vd_customers`, `vd_volume_actuals`, `vd_monthly_targets`, `vd_rebate_agreements`, `vd_rebate_progress` |

The `vd_*` and `voice_order_*` tables appear to be read-only lookup/reporting tables accessed server-side, which is a common reason to leave RLS off — but this should be explicitly reviewed before exposing the anon key to any client.

---

## Entity Relationship (key links)

```
vd_customers ──< vd_volume_actuals >── (vol_key) ──> vd_products
vd_customers ──< vd_rebate_agreements >── vd_rebate_progress
vd_products ──< vd_tier_pricing
vd_products / vd_volume_actuals / vd_monthly_targets share vol_key (denormalized)

stores ──< store_visit_bookings
stores.curef ── voice_order_customers.curef (soft link)

form_schemas ──< form_respondents
form_schemas ──< form_submissions

haven_offsite_declarations ──< haven_offsite_approvals
```
