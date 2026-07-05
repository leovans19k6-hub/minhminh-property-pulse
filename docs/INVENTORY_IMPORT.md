# Inventory Import (Phase 5E)

## Model

- `inventory_import_jobs` — one row per CSV upload; pending → processing → completed/failed.
- `inventory_import_rows` — pending → success/failed.

## Trusted RPCs

| RPC | Semantics |
|-----|-----------|
| `inventory_import_add_rows(job_id, rows)` | Manager auth + `status='pending'`. Cap total ≤ 5000, product_code ≤ 128 chars, reject duplicate product_code in payload. |
| `commit_inventory_import(job_id)` | **ALL_OR_NOTHING**. Every row goes through `create_product_with_values` / `update_product_with_values`. Any failure raises → whole transaction rolls back. Job locked `FOR UPDATE`; double-commit rejected via `job_not_pending`. |

## Rationale

Prior implementation used per-row `EXCEPTION` (PARTIAL_SUCCESS). Mid-batch failure left the DB in an ambiguous half-imported state. Phase 5E enforces atomic commit: fix the CSV, re-upload.

## Client

`parseCsv` is a UX helper — server re-validates every value (types, applicability, options, required). CSV mistakes surface as a single failure that aborts the commit.

## Out of scope (v1)

- Import of price options via CSV.
- Streaming > 5000 rows.
- Server-side dry-run (`preview_inventory_import`) — planned.