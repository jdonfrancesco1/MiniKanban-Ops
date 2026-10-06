import { handleProvisionHttp } from "@/lib/provision/http"
import { drizzleProvisionPersistence } from "@/lib/provision/persist"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function handle(request: Request) {
  return handleProvisionHttp(request, {
    provisionSecret: process.env.OPS_PROVISION_SECRET,
    fleetSecret: process.env.OPS_BOARD_SECRET,
    configuredBaseUrl: process.env.OPS_PUBLIC_BASE_URL,
    persistence: drizzleProvisionPersistence(),
  })
}

export const POST = handle
export const GET = handle
export const PUT = handle
export const PATCH = handle
export const DELETE = handle
