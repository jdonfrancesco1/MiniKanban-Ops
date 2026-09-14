import { NextResponse } from "next/server"
import { getOpsDiagnosticsPayload, opsApiError } from "@/lib/api/ops"

export const dynamic = "force-dynamic"

/** Session-gated, non-secret DB fingerprint so James can confirm Autoscale == Helium. */
export async function GET() {
  try {
    return NextResponse.json(await getOpsDiagnosticsPayload())
  } catch (error) {
    return opsApiError(error)
  }
}
