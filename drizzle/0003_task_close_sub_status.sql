-- Close reason for a card that has entered Done. Null until then.
-- Existing Done cards stay null — do not invent a reason.
-- Existing empty descriptions are left alone; new creates are validated in the app.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS close_sub_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tasks_close_sub_status_check'
  ) THEN
    ALTER TABLE tasks
      ADD CONSTRAINT tasks_close_sub_status_check
      CHECK (
        close_sub_status IS NULL
        OR close_sub_status IN ('Closed', 'No Longer Needed', 'Duplicate')
      );
  END IF;
END $$;
