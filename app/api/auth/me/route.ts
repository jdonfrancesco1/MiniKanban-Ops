import { NextResponse } from "next/server"
import { getOpsAuthState } from "@/lib/auth-actions"

export async function GET() {
  const state = await getOpsAuthState()
  return NextResponse.json({
    ...state,
    user: state.authenticated
      ? { uid: "ops", displayName: "Ops", phoneNumber: null }
      : null,
  })
}
