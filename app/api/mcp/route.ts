import { handleMcpHttp, mcpCorsPreflight } from "@/lib/mcp/http"
import { liveOpsPort } from "@/lib/mcp/live-port"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function handle(request: Request) {
  return handleMcpHttp(request, { port: liveOpsPort })
}

export const GET = handle
export const POST = handle
export const DELETE = handle
export const OPTIONS = mcpCorsPreflight
