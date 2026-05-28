-- ============================================================
-- Organizér — Cleanup migrace
-- ============================================================
-- Přidává sloupec completed_at na tasks, aby Edge Function věděla,
-- kdy byl úkol splněn, a mohla ho po 5 dnech smazat.
-- Pro stávající splněné úkoly nastaví completed_at = now()
-- (jako kdyby byly splněny právě teď — od dnes počítáme 5 dní).
-- ============================================================

alter table public.tasks
  add column if not exists completed_at timestamptz;

-- Backfill: existujícím completed úkolům dej completed_at = now()
update public.tasks
set completed_at = now()
where completed = true and completed_at is null;
