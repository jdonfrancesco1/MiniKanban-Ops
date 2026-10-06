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
      position?: unknown
      beforeTaskId?: unknown
      closeSubStatus?: unknown
    }
    if (body.columnTitle !== undefined && typeof body.columnTitle !== "string") {
      return NextResponse.json({ error: "columnTitle must be a string" }, { status: 400 })
    }
    if (body.columnId !== undefined && typeof body.columnId !== "string") {
      return NextResponse.json({ error: "columnId must be a string" }, { status: 400 })
    }
    if (body.position !== undefined && typeof body.position !== "number") {
      return NextResponse.json({ error: "position must be a number" }, { status: 400 })
    }
    if (body.beforeTaskId !== undefined && body.beforeTaskId !== null && typeof body.beforeTaskId !== "string") {
      return NextResponse.json({ error: "beforeTaskId must be a string or null" }, { status: 400 })
    }
    if (body.closeSubStatus !== undefined && body.closeSubStatus !== null && typeof body.closeSubStatus !== "string") {
      return NextResponse.json({ error: "closeSubStatus must be a string" }, { status: 400 })
    }
    if (!body.columnTitle && !body.columnId) {
      return NextResponse.json({ error: "columnTitle or columnId is required" }, { status: 400 })
    }

    return NextResponse.json(
      await moveOpsTask(id, {
        columnTitle: body.columnTitle,
        columnId: body.columnId,
        position: body.position,
        beforeTaskId: body.beforeTaskId ?? null,
        closeSubStatus: body.closeSubStatus,
      }),
    )
  } catch (error) {
    return opsApiError(error)
  }
}
