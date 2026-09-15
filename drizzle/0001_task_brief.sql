-- Card-face brief (1–2 lines). Full ask stays in description.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS brief text;

-- Best-effort title matches for existing Need you / Giant DeepCore smoke cards.
-- Runtime ensureDefaultBoard also backfills via lib/card-copy.ts (handles prefixes).

UPDATE tasks
SET
  brief = 'Open Library — see recent memories, not blank.',
  description = 'On DeepCore Companion tip e9e831d: Open Library. Confirm you see your recent memories (at least a handful), not a blank list. Say PASS or what failed.',
  labels = CASE
    WHEN labels @> '["Giant"]'::jsonb THEN labels
    ELSE '["Giant"]'::jsonb || COALESCE(labels, '[]'::jsonb)
  END,
  updated_at = now()
WHERE title ~* 'library'
  AND title !~* 'sticky|capture|scope|share|attribution|passkey|voice|face'
  AND (brief IS NULL OR btrim(brief) = '');

UPDATE tasks
SET
  brief = 'Today: Ask stays one row while you scroll.',
  description = 'On Today, scroll the page. Ask must stay visible in one row (not scroll away, not a huge block). PASS or fail note.',
  labels = CASE
    WHEN labels @> '["Giant"]'::jsonb THEN labels
    ELSE '["Giant"]'::jsonb || COALESCE(labels, '[]'::jsonb)
  END,
  updated_at = now()
WHERE title ~* 'sticky[[:space:]]*ask'
  AND (brief IS NULL OR btrim(brief) = '');

UPDATE tasks
SET
  brief = 'Bottom + is Capture only — no second big circle.',
  description = 'Bottom center + is Capture only. No second big circle fighting it.',
  labels = CASE
    WHEN labels @> '["Giant"]'::jsonb THEN labels
    ELSE '["Giant"]'::jsonb || COALESCE(labels, '[]'::jsonb)
  END,
  updated_at = now()
WHERE title ~* 'capture[[:space:]]*\+|capture\+|capture[[:space:]]*only|bottom[[:space:]]*\+'
  AND (brief IS NULL OR btrim(brief) = '');

UPDATE tasks
SET
  brief = 'Mine / Team / Everything actually changes the list.',
  description = 'Scope switch Mine / Team / Everything must change what you see.',
  labels = CASE
    WHEN labels @> '["Giant"]'::jsonb THEN labels
    ELSE '["Giant"]'::jsonb || COALESCE(labels, '[]'::jsonb)
  END,
  updated_at = now()
WHERE title ~* '\mscope\M'
  AND (brief IS NULL OR btrim(brief) = '');

UPDATE tasks
SET
  brief = 'New capture: Share defaults OFF.',
  description = 'New capture defaults Share off (not auto-sharing to Team).',
  labels = CASE
    WHEN labels @> '["Giant"]'::jsonb THEN labels
    ELSE '["Giant"]'::jsonb || COALESCE(labels, '[]'::jsonb)
  END,
  updated_at = now()
WHERE title ~* '\mshare\M'
  AND title !~* 'attribution'
  AND (brief IS NULL OR btrim(brief) = '');

UPDATE tasks
SET
  brief = 'Shared memory shows who remembered it.',
  description = 'On a shared memory, you can see who remembered it.',
  labels = CASE
    WHEN labels @> '["Giant"]'::jsonb THEN labels
    ELSE '["Giant"]'::jsonb || COALESCE(labels, '[]'::jsonb)
  END,
  updated_at = now()
WHERE title ~* 'attribution'
  AND (brief IS NULL OR btrim(brief) = '');

UPDATE tasks
SET
  brief = 'After saving a passkey, you can leave the screen.',
  description = 'After saving a passkey, you can leave that screen (not stuck).',
  labels = CASE
    WHEN labels @> '["Giant"]'::jsonb THEN labels
    ELSE '["Giant"]'::jsonb || COALESCE(labels, '[]'::jsonb)
  END,
  updated_at = now()
WHERE title ~* 'passkey'
  AND (brief IS NULL OR btrim(brief) = '');

UPDATE tasks
SET
  brief = 'Record → Play Back hears YOUR audio → Remember.',
  description = 'Record a take, hit Play Back, hear your audio, then Remember.',
  labels = CASE
    WHEN labels @> '["Giant"]'::jsonb THEN labels
    ELSE '["Giant"]'::jsonb || COALESCE(labels, '[]'::jsonb)
  END,
  updated_at = now()
WHERE title ~* 'voice[[:space:]]*play[[:space:]]*back|play[[:space:]]*back'
  AND (brief IS NULL OR btrim(brief) = '');

UPDATE tasks
SET
  brief = 'With Face ID lock on, open app → Face ID prompts itself.',
  description = 'With Face ID lock on, opening the app prompts Face ID by itself — no Use Face ID tap first.',
  labels = CASE
    WHEN labels @> '["Giant"]'::jsonb THEN labels
    ELSE '["Giant"]'::jsonb || COALESCE(labels, '[]'::jsonb)
  END,
  updated_at = now()
WHERE title ~* 'face[[:space:]]*id'
  AND (brief IS NULL OR btrim(brief) = '');
