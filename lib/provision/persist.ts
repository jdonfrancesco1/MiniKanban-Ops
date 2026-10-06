import { and, asc, eq } from "drizzle-orm"
import { assertCustomerTenantId } from "@/lib/auth/credentials"
import { db } from "@/lib/db"
import { missingOpsColumnTitles } from "@/lib/db/reconcile-ops"
import { boards, columns, tenantCredentials } from "@/lib/db/schema"
import { FLEET_TENANT_ID } from "@/lib/db/ops-defaults"
import { runAsVerifiedTenant } from "@/lib/db/tenant-rls"
import { ProvisionBuyerConflict, isExternalBuyerConflict } from "@/lib/provision/error"
import { customerBoardPlan, type ProvisionBoard, type ProvisionPersistence, type ProvisionRow } from "@/lib/provision/provision"

function asProvisionRow(row: {
  tenantId: string
  salt: string
  verifier: string
  externalBuyerId: string | null
}): ProvisionRow | null {
  if (!row.externalBuyerId || row.tenantId === FLEET_TENANT_ID) return null
  return {
    tenantId: row.tenantId,
    salt: row.salt,
    verifier: row.verifier,
    externalBuyerId: row.externalBuyerId,
  }
}

async function findByBuyerId(buyerId: string) {
  const [row] = await db
    .select({
      tenantId: tenantCredentials.tenantId,
      salt: tenantCredentials.salt,
      verifier: tenantCredentials.verifier,
      externalBuyerId: tenantCredentials.externalBuyerId,
    })
    .from(tenantCredentials)
    .where(eq(tenantCredentials.externalBuyerId, buyerId))
    .limit(1)
  return row ? asProvisionRow(row) : null
}

async function tenantExists(tenantId: string) {
  const [row] = await db
    .select({ tenantId: tenantCredentials.tenantId })
    .from(tenantCredentials)
    .where(eq(tenantCredentials.tenantId, tenantId))
    .limit(1)
  return Boolean(row && row.tenantId !== FLEET_TENANT_ID)
}

async function insertCredential(row: ProvisionRow) {
  assertCustomerTenantId(row.tenantId)
  try {
    await db.insert(tenantCredentials).values({
      tenantId: row.tenantId,
      salt: row.salt,
      verifier: row.verifier,
      externalBuyerId: row.externalBuyerId,
    })
  } catch (error) {
    if (isExternalBuyerConflict(error)) throw new ProvisionBuyerConflict()
    throw error
  }
}

/**
 * Default ops board for a server-minted customer tenant.
 * Statements run with app.tenant_id set to that tenant via runAsVerifiedTenant,
 * which is the Slice D set_config path. The id is not taken from the request.
 */
export async function ensureCustomerDefaultBoard(tenantId: string): Promise<ProvisionBoard> {
  assertCustomerTenantId(tenantId)
  const plan = customerBoardPlan(tenantId)
  return runAsVerifiedTenant(tenantId, async () => {
    const [existing] = await db
      .select({
        id: boards.id,
        title: boards.title,
        tenantId: boards.tenantId,
      })
      .from(boards)
      .where(and(eq(boards.tenantId, tenantId), eq(boards.slug, plan.slug)))
      .limit(1)

    let boardId = existing?.id
    let title = existing?.title ?? plan.title
    if (!boardId || existing?.tenantId !== tenantId) {
      const [created] = await db
        .insert(boards)
        .values({
          tenantId,
          title: plan.title,
          description: plan.description,
          slug: plan.slug,
        })
        .returning({ id: boards.id, title: boards.title })
      if (!created) throw new Error("Failed to create the customer ops board")
      boardId = created.id
      title = created.title
    }

    const existingColumns = await db
      .select({ id: columns.id, title: columns.title, order: columns.order })
      .from(columns)
      .where(and(eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
      .orderBy(asc(columns.order))

    const missing = missingOpsColumnTitles(existingColumns.map((column) => column.title))
    if (missing.length > 0) {
      const start = existingColumns.length === 0 ? 0 : existingColumns[existingColumns.length - 1].order + 1
      await db.insert(columns).values(
        missing.map((columnTitle, index) => ({
          boardId,
          tenantId,
          title: columnTitle,
          order: start + index,
        })),
      )
    }

    const stored = await db
      .select({ id: columns.id, title: columns.title, order: columns.order })
      .from(columns)
      .where(and(eq(columns.boardId, boardId), eq(columns.tenantId, tenantId)))
      .orderBy(asc(columns.order))

    return {
      id: String(boardId),
      tenantId,
      slug: plan.slug,
      title,
      columns: stored.map((column) => ({
        id: String(column.id),
        title: column.title,
        order: column.order,
      })),
    }
  })
}

export function drizzleProvisionPersistence(): ProvisionPersistence {
  return {
    findByBuyerId,
    tenantExists,
    insertCredential,
    ensureDefaultBoard: ensureCustomerDefaultBoard,
  }
}
