import { NextResponse } from "next/server"
import { moveOpsTask, opsApiError } from "@/lib/api/ops"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as {
      columnTitle?: unknown
      columnId?: unknown
    }
    if (body.columnTitle !== undefined && typeof body.columnTitle !== "string") {
      return NextResponse.json({ error: "columnTitle must be a string" }, { status: 400 })
    }
    if (body.columnId !== undefined && typeof body.columnId !== "string") {
      return NextResponse.json({ error: "columnId must be a string" }, { status: 400 })
    }
    if (!body.columnTitle && !body.columnId) {
      return NextResponse.json({ error: "columnTitle or columnId is required" }, { status: 400 })
    }

    return NextResponse.json(
      await moveOpsTask(id, {
        columnTitle: body.columnTitle,
        columnId: body.columnId,
      }),
    )
  } catch (error) {
    return opsApiError(error)
  }
}
