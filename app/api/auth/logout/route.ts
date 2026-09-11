import { NextResponse } from "next/server"
import { logoutOpsSession } from "@/lib/auth-actions"

export async function POST() {
  await logoutOpsSession()
  return NextResponse.json({ success: true })
}
