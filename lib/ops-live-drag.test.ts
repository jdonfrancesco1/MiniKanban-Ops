import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

const pageSource = readFileSync(new URL("../app/boards/[id]/page.tsx", import.meta.url), "utf8")
const boardSource = readFileSync(new URL("../components/kanban-board.tsx", import.meta.url), "utf8")
const cardSource = readFileSync(new URL("../components/kanban-card.tsx", import.meta.url), "utf8")

function sliceFn(source: string, startToken: string, endToken: string) {
  const start = source.indexOf(startToken)
  const end = source.indexOf(endToken, start + startToken.length)
  assert.notEqual(start, -1, `missing ${startToken}`)
  assert.notEqual(end, -1, `missing ${endToken}`)
  return source.slice(start, end)
}

describe("ops live drag wiring", () => {
  it("keeps /boards/ops on the PR #19 KanbanBoard path", () => {
    assert.match(pageSource, /KanbanBoardComponent/)
    assert.match(pageSource, /from "@\/components\/kanban-board"/)
    assert.match(boardSource, /onDragOver/)
    assert.match(boardSource, /applyTaskDragOver/)
    assert.match(boardSource, /KanbanDragOverlay/)
  })

  it("applies the drop to local tasks immediately and persists over JSON, without a board reload", () => {
    const moveFn = sliceFn(pageSource, "const handleTaskMove", "const visibleTasks")
    assert.match(moveFn, /setTasks\(next\)/)
    assert.match(moveFn, /persistOpsTaskMove/)
    assert.match(moveFn, /pendingMovesRef/)
    assert.doesNotMatch(moveFn, /loadBoardData/)
    assert.doesNotMatch(moveFn, /setIsLoading\(true\)/)
    assert.match(moveFn, /isOpsBoardRoute/)
    assert.match(pageSource, /if \(\(isLoading \|\| authLoading\) && !hasLoaded\)/)
  })

  it("shows a derived short id on card chrome", () => {
    const badgeSource = readFileSync(new URL("../components/task-short-id.tsx", import.meta.url), "utf8")
    assert.match(cardSource, /TaskShortIdBadge/)
    assert.match(badgeSource, /data-testid="task-short-id"/)
    assert.match(badgeSource, /taskShortId/)
  })
})
