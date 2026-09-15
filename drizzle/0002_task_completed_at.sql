-- When a card enters Done. Cleared if it leaves Done.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Best-effort backfill: existing Done cards without completed_at use updated_at
-- (last edit / last move), not a true completion timestamp.
UPDATE tasks t
SET completed_at = t.updated_at
FROM columns c
WHERE t.column_id = c.id
  AND lower(btrim(c.title)) = 'done'
  AND t.completed_at IS NULL;
