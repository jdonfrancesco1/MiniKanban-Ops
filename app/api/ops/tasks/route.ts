import { NextResponse } from "next/server"
import { createOpsTask, opsApiError } from "@/lib/api/ops"

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      title?: unknown
      columnTitle?: unknown
    }
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }
    if (body.columnTitle !== undefined && typeof body.columnTitle !== "string") {
      return NextResponse.json({ error: "columnTitle must be a string" }, { status: 400 })
    }

    return NextResponse.json(
      await createOpsTask({
        title: body.title,
        columnTitle: body.columnTitle,
      }),
      { status: 201 },
    )
  } catch (error) {
    return opsApiError(error)
  }
}
