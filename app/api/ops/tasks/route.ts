import { NextResponse } from "next/server"
import { assertOwnedBoard, createOpsTask, opsApiError } from "@/lib/api/ops"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown
      columnTitle?: unknown
      brief?: unknown
      description?: unknown
      labels?: unknown
      closeSubStatus?: unknown
      boardId?: unknown
    }
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }
    if (body.columnTitle !== undefined && typeof body.columnTitle !== "string") {
      return NextResponse.json({ error: "columnTitle must be a string" }, { status: 400 })
    }
    if (body.brief !== undefined && typeof body.brief !== "string") {
      return NextResponse.json({ error: "brief must be a string" }, { status: 400 })
    }
    if (body.description !== undefined && typeof body.description !== "string") {
      return NextResponse.json({ error: "description must be a string" }, { status: 400 })
    }
    if (body.labels !== undefined && (!Array.isArray(body.labels) || body.labels.some((label) => typeof label !== "string"))) {
      return NextResponse.json({ error: "labels must be a string array" }, { status: 400 })
    }
    if (body.closeSubStatus !== undefined && body.closeSubStatus !== null && typeof body.closeSubStatus !== "string") {
      return NextResponse.json({ error: "closeSubStatus must be a string" }, { status: 400 })
    }
    if (body.boardId !== undefined && typeof body.boardId !== "string") {
      return NextResponse.json({ error: "boardId must be a string" }, { status: 400 })
    }
    await assertOwnedBoard(typeof body.boardId === "string" ? body.boardId : undefined)

    const created = await createOpsTask({
      title: body.title,
      columnTitle: body.columnTitle,
      brief: body.brief,
      description: body.description,
      labels: body.labels,
      closeSubStatus: body.closeSubStatus,
    })
    return NextResponse.json(created, { status: created.skipped ? 200 : 201 })
  } catch (error) {
    return opsApiError(error)
  }
}
