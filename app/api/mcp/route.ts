import { loadTenantCredentialRecords } from "@/lib/auth/credential-store"
import { handleMcpHttp, mcpCorsPreflight } from "@/lib/mcp/http"
import { liveOpsPort, liveOpsPortForTenant } from "@/lib/mcp/live-port"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function handle(request: Request) {
  return handleMcpHttp(request, {
    port: liveOpsPort,
    portForTenant: liveOpsPortForTenant,
    loadCustomerCredentials: loadTenantCredentialRecords,
  })
}

export const GET = handle
export const POST = handle
export const DELETE = handle
export const OPTIONS = mcpCorsPreflight
