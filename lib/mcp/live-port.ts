import {
  archiveOpsTask,
  createOpsTask,
  getOpsBoardPayload,
  moveOpsTask,
  patchOpsTask,
  resolveOpsTask,
  serializeOpsBoard,
} from "@/lib/api/ops"
import { getBoard } from "@/lib/actions/boards"
import { requireActorTenant } from "@/lib/auth/session"
import { OPS_MCP_BOARD_SLUG } from "@/lib/mcp/lookup"
import { OpsAccessError } from "@/lib/ops/access"
import type { OpsToolPort } from "@/lib/mcp/tools"

async function assertBoundTenant(tenantId: string) {
  const actor = await requireActorTenant()
  if (actor !== tenantId) throw new OpsAccessError(403)
}

export const liveOpsPort: OpsToolPort = {
  async listBoard(slug = OPS_MCP_BOARD_SLUG) {
    const requested = (slug || OPS_MCP_BOARD_SLUG).trim()
    if (!requested || requested.toLowerCase() === OPS_MCP_BOARD_SLUG) {
      const { board } = await getOpsBoardPayload()
      return board
    }
    const board = await getBoard(requested)
    return serializeOpsBoard(board)
  },
  async insertTask(input) {
    return createOpsTask(input)
  },
  async resolveTask(query) {
    return resolveOpsTask(query)
  },
  async moveTask(taskId, input) {
    return moveOpsTask(taskId, input)
  },
  async updateTask(taskId, input) {
    return patchOpsTask(taskId, input)
  },
  async archiveTask(taskId) {
    return archiveOpsTask(taskId)
  },
}

/** Customer MCP. Refuses a tenant id that is not the verified actor, and never uses the fleet board. */
export function liveOpsPortForTenant(tenantId: string): OpsToolPort {
  return {
    async listBoard(slug) {
      await assertBoundTenant(tenantId)
      return liveOpsPort.listBoard(slug)
    },
    async insertTask(input) {
      await assertBoundTenant(tenantId)
      return liveOpsPort.insertTask(input)
    },
    async resolveTask(query) {
      await assertBoundTenant(tenantId)
      return liveOpsPort.resolveTask(query)
    },
    async moveTask(taskId, input) {
      await assertBoundTenant(tenantId)
      return liveOpsPort.moveTask(taskId, input)
    },
    async updateTask(taskId, input) {
      await assertBoundTenant(tenantId)
      return liveOpsPort.updateTask(taskId, input)
    },
    async archiveTask(taskId) {
      await assertBoundTenant(tenantId)
      return liveOpsPort.archiveTask(taskId)
    },
  }
}
