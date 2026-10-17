---
name: data-layer-design
description: "Persistent data design: schema, normalization, migrations, soft-delete, counters, transactions, undo/restore, and exports. Use when designing or changing a database, a localStorage/IndexedDB layer, CSV/JSON import-export, sync, or when the question is 'how do I store X' / 'where should X live'."
license: MIT
metadata:
  author: fareed
  version: "1.0"
---

# Data Layer Design

Design the shape of data first. Boxy schemas cause cascading pain.

## Cardinal rules

- **Schema-first.** Write the schema (tables + columns + types + constraints) before code. No ad-hoc fields.
- **Never rename or drop in one step.** Add the new column, backfill, switch readers, *then* drop the old in a later release.
- **Version the schema.** `schema_version` in storage. On load, migrate. Forward-compatible reads (never assume columns exist).
- **Soft-delete everything user-created.** `deleted_at` timestamp, recoverable 30 days, then GC. Never hard-delete on first action.
- **IDs are stable and owned by the creator.** Never auto-increment for entities that can be referred to from another client.
- **IDs never get reused.**

## Storage choice

- Pure local (single device) → SQLite (via expo-sqlite / Drizzle) or IndexedDB for large; localStorage only for boot state <1 MB.
- Local-first with optional sync → SQLite + versioned rows (`updated_at`, `deleted_at`, vector clocks for conflict).
- Multi-user shared → Postgres on the server, sync via row-level ownership.

## Mutations — always transactional

Wrap multi-row writes in BEGIN/COMMIT. A transfer = `from account -N, to account +N` must fail or succeed together. Never write one side then the other across await boundaries.

## Migration rules

1. Migration scripts are idempotent and numbered.
2. They may `ALTER ADD` only; never rewrite columns in-place in old apps.
3. Test the migration on real older DB snapshots, not just clean ones.
4. Every migration has a rollback note, even if rollback isn't implemented — for future-you.

## Backups

- Export = full JSON dump (versioned schema header).
- Import always offers: replace / merge / dry-run.
- Validate on import: schema version, required fields, types. Reject invalid silently-with-report, not silently-with-crash.

## When NOT to normalize

- A `metadata` JSON column is fine for sparse, optional, foreign-leaning attributes.
- Audit logs / event streams are append-only; don't fight it.
- Full-text style `notes` need no tokenization in a small app; just store the text and search with case-fold matching.

## Anti-patterns

- Storing money as floating point. Always integer minor units.
- `updated_at` updated manually and drifted. Use a single `touchRow()` helper.
- Boolean flags on tables ("is_deleted", "is_active"). Use nullable timestamps.
- Catching JSON.parse errors silently and serving an empty store.
- Foreign keys without ON DELETE rules.

## Output format

Tables + columns (name, type, constraints), indices, migrations list (numbered), and the backup/restore contract. State the consent (“*a row that loses its link is stranded, document it*”).
