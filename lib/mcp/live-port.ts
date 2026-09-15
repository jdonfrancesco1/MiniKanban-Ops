import {
  archiveOpsTask,
  createOpsTask,
  getOpsBoardPayload,
  moveOpsTask,
  patchOpsTask,
  resolveOpsTask,
} from "@/lib/api/ops"
import { OPS_MCP_BOARD_SLUG, isOpsBoardSlug } from "@/lib/mcp/lookup"
import type { OpsToolPort } from "@/lib/mcp/tools"

export const liveOpsPort: OpsToolPort = {
  async listBoard(slug = OPS_MCP_BOARD_SLUG) {
    if (!isOpsBoardSlug(slug)) {
      throw new Error(`Only board slug "${OPS_MCP_BOARD_SLUG}" is supported`)
    }
    const { board } = await getOpsBoardPayload()
    return board
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
