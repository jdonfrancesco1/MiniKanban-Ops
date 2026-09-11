import { NextResponse } from "next/server"
import { opsApiError, patchOpsTask } from "@/lib/api/ops"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown
      description?: unknown
    }
    if (body.title !== undefined && typeof body.title !== "string") {
      return NextResponse.json({ error: "title must be a string" }, { status: 400 })
    }
    if (body.description !== undefined && typeof body.description !== "string") {
      return NextResponse.json({ error: "description must be a string" }, { status: 400 })
    }

    return NextResponse.json(
      await patchOpsTask(id, {
        title: body.title,
        description: body.description,
      }),
    )
  } catch (error) {
    return opsApiError(error)
  }
}
