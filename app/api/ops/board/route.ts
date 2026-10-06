import { NextResponse } from "next/server"
import { getBoard } from "@/lib/actions/boards"
import { buildOpsDiagnostics, getOpsBoardPayload, opsApiError, serializeOpsBoard } from "@/lib/api/ops"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  try {
    const boardId = new URL(request.url).searchParams.get("boardId")
    if (boardId?.trim()) {
      const board = await getBoard(boardId.trim())
      return NextResponse.json({
        board: serializeOpsBoard(board),
        diagnostics: buildOpsDiagnostics(board),
      })
    }
    return NextResponse.json(await getOpsBoardPayload())
  } catch (error) {
    return opsApiError(error)
  }
}
