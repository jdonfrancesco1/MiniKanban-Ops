import { NextResponse } from "next/server"
import { archiveOpsTask, opsApiError, patchOpsTask } from "@/lib/api/ops"

export const dynamic = "force-dynamic"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown
      description?: unknown
      brief?: unknown
      labels?: unknown
    }
    if (body.title !== undefined && typeof body.title !== "string") {
      return NextResponse.json({ error: "title must be a string" }, { status: 400 })
    }
    if (body.description !== undefined && typeof body.description !== "string") {
      return NextResponse.json({ error: "description must be a string" }, { status: 400 })
    }
    if (body.brief !== undefined && typeof body.brief !== "string") {
      return NextResponse.json({ error: "brief must be a string" }, { status: 400 })
    }
    if (body.labels !== undefined && (!Array.isArray(body.labels) || body.labels.some((label) => typeof label !== "string"))) {
      return NextResponse.json({ error: "labels must be a string array" }, { status: 400 })
    }

    return NextResponse.json(
      await patchOpsTask(id, {
        title: body.title,
        description: body.description,
        brief: body.brief,
        labels: body.labels,
      }),
    )
  } catch (error) {
    return opsApiError(error)
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params
    return NextResponse.json(await archiveOpsTask(id))
  } catch (error) {
    return opsApiError(error)
  }
}
