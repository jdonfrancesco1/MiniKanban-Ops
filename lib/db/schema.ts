import { sql } from "drizzle-orm"
import {
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"

/**
 * Shared Worker + one Postgres. tenant_id is the row boundary (text so the
 * fleet board can use the named key `fleet`). Board id stays a row id inside
 * a tenant; it is not a tenant boundary. FKs on board_id / column_id stay.
 * Composite FKs keep each child in the same tenant as its parent.
 * Row policies are drafted in drizzle/0004_tenant_id.sql and forced in
 * drizzle/0006_force_rls.sql. They are intentionally absent from this Drizzle
 * schema: drizzle-kit enables row security when a table has policies, and
 * db:push must not be the switch that turns that on.
 */

export const boards = pgTable(
  "boards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: text("tenant_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    slug: text("slug"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("boards_id_tenant_id_idx").on(table.id, table.tenantId),
    uniqueIndex("boards_tenant_id_slug_idx").on(table.tenantId, table.slug),
    index("boards_tenant_id_idx").on(table.tenantId),
    check(
      "boards_tenant_id_nonempty_chk",
      sql`${table.tenantId} = btrim(${table.tenantId}) AND length(${table.tenantId}) > 0`,
    ),
  ],
)

export const columns = pgTable(
  "columns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id").notNull(),
    title: text("title").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("columns_id_tenant_id_idx").on(table.id, table.tenantId),
    index("columns_tenant_id_board_id_idx").on(table.tenantId, table.boardId),
    foreignKey({
      columns: [table.boardId, table.tenantId],
      foreignColumns: [boards.id, boards.tenantId],
      name: "columns_board_tenant_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    check(
      "columns_tenant_id_nonempty_chk",
      sql`${table.tenantId} = btrim(${table.tenantId}) AND length(${table.tenantId}) > 0`,
    ),
  ],
)

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    columnId: uuid("column_id")
      .notNull()
      .references(() => columns.id, { onDelete: "cascade" }),
    tenantId: text("tenant_id").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    brief: text("brief"),
    labels: jsonb("labels").$type<string[]>().notNull().default([]),
    order: integer("order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Closed | No Longer Needed | Duplicate. Null until the card is closed into Done. */
    closeSubStatus: text("close_sub_status"),
  },
  (table) => [
    index("tasks_tenant_id_board_id_idx").on(table.tenantId, table.boardId),
    index("tasks_tenant_id_column_id_idx").on(table.tenantId, table.columnId),
    foreignKey({
      columns: [table.boardId, table.tenantId],
      foreignColumns: [boards.id, boards.tenantId],
      name: "tasks_board_tenant_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    foreignKey({
      columns: [table.columnId, table.tenantId],
      foreignColumns: [columns.id, columns.tenantId],
      name: "tasks_column_tenant_fk",
    })
      .onDelete("cascade")
      .onUpdate("cascade"),
    check(
      "tasks_tenant_id_nonempty_chk",
      sql`${table.tenantId} = btrim(${table.tenantId}) AND length(${table.tenantId}) > 0`,
    ),
  ],
)

/**
 * Per-tenant credential verifier (Slice B). The plaintext secret is never stored.
 * `salt` and `verifier` are hex HMAC material. Tenant `fleet` is rejected:
 * that tenant uses OPS_BOARD_SECRET only. No RLS policy is declared here.
 */
export const tenantCredentials = pgTable(
  "tenant_credentials",
  {
    tenantId: text("tenant_id").primaryKey(),
    salt: text("salt").notNull(),
    verifier: text("verifier").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("tenant_credentials_verifier_idx").on(table.verifier),
    check(
      "tenant_credentials_tenant_id_nonempty_chk",
      sql`${table.tenantId} = btrim(${table.tenantId}) AND length(${table.tenantId}) > 0`,
    ),
    check("tenant_credentials_not_fleet_chk", sql`${table.tenantId} <> 'fleet'`),
    check("tenant_credentials_salt_nonempty_chk", sql`length(${table.salt}) > 0`),
    check("tenant_credentials_verifier_nonempty_chk", sql`length(${table.verifier}) > 0`),
  ],
)

export type BoardRow = typeof boards.$inferSelect
export type ColumnRow = typeof columns.$inferSelect
export type TaskRow = typeof tasks.$inferSelect
export type TenantCredentialRow = typeof tenantCredentials.$inferSelect
