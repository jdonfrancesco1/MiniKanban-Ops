-- Manual equivalent of `drizzle-kit push` / migrate for Neon Postgres.
-- Prefer: DATABASE_URL=... npx drizzle-kit push

CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  "order" integer NOT NULL DEFAULT 0,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS columns_board_id_order_idx ON columns (board_id, "order");
CREATE INDEX IF NOT EXISTS tasks_column_id_order_idx ON tasks (column_id, "order");
CREATE INDEX IF NOT EXISTS tasks_board_id_archived_idx ON tasks (board_id, archived_at);
