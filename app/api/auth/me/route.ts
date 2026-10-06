import { NextResponse } from "next/server"
import { getOpsAuthState } from "@/lib/auth-actions"

export async function GET() {
  const state = await getOpsAuthState()
  return NextResponse.json({
    authenticated: state.authenticated,
    gateEnabled: state.gateEnabled,
    tenantId: state.tenantId,
    user: state.authenticated ? state.user : null,
  })
}
