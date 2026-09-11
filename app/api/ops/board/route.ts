import { NextResponse } from "next/server"
import { getOpsBoardPayload, opsApiError } from "@/lib/api/ops"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return NextResponse.json(await getOpsBoardPayload())
  } catch (error) {
    return opsApiError(error)
  }
}
