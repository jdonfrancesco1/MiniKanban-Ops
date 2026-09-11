import { NextResponse } from "next/server"
import { loginWithOpsSecret } from "@/lib/auth-actions"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { secret?: string }
  const result = await loginWithOpsSecret(body.secret ?? "")
  if (!result.success) {
    return NextResponse.json(result, { status: 401 })
  }
  return NextResponse.json(result)
}
