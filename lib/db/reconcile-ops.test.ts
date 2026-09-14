import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isFalseArchive,
  isTaskHiddenAsArchived,
  missingOpsColumnTitles,
  pickCanonicalOpsBoard,
  planOpsTaskPlacements,
} from "./reconcile-ops.ts"

describe("isFalseArchive", () => {
  it("treats insert-time archived_at as live", () => {
    const created = new Date("2026-09-01T12:00:00.000Z")
    const archived = new Date("2026-09-01T12:00:00.400Z")
    assert.equal(isFalseArchive(archived, created), true)
    assert.equal(isTaskHiddenAsArchived(archived, created), false)
  })

  it("keeps a later archive hidden", () => {
    const created = new Date("2026-09-01T12:00:00.000Z")
    const archived = new Date("2026-09-02T12:00:00.000Z")
    assert.equal(isFalseArchive(archived, created), false)
    assert.equal(isTaskHiddenAsArchived(archived, created), true)
  })

  it("treats null archived_at as visible", () => {
    assert.equal(isTaskHiddenAsArchived(null, new Date()), false)
  })
})

describe("pickCanonicalOpsBoard", () => {
  it("prefers the slug=ops board when it already has tasks", () => {
    const picked = pickCanonicalOpsBoard([
      { id: "empty", title: "Other", slug: null, taskCount: 0 },
      { id: "ops", title: "Ops", slug: "ops", taskCount: 13 },
    ])
    assert.equal(picked?.id, "ops")
  })

  it("prefers the board that actually has the Neon rows over an empty slug=ops shell", () => {
    const picked = pickCanonicalOpsBoard([
      { id: "empty-ops", title: "Ops", slug: "ops", taskCount: 0 },
      { id: "legacy", title: "Work", slug: null, taskCount: 13 },
    ])
    assert.equal(picked?.id, "legacy")
  })
})

describe("planOpsTaskPlacements", () => {
  const opsColumns = [
    { id: "need", title: "Need you", boardId: "ops", order: 0 },
    { id: "on", title: "I'm on", boardId: "ops", order: 1 },
  ]

  it("rehomes orphaned column ids onto a matching title or the first column", () => {
    const placements = planOpsTaskPlacements({
      opsBoardId: "ops",
      opsColumns,
      columns: [...opsColumns, { id: "old-on", title: "I'm on", boardId: "legacy", order: 0 }],
      tasks: [
        {
          id: "t1",
          boardId: "ops",
          columnId: "missing",
          archivedAt: null,
          createdAt: new Date(),
        },
        {
          id: "t2",
          boardId: "legacy",
          columnId: "old-on",
          archivedAt: null,
          createdAt: new Date(),
        },
      ],
      adoptForeignTasks: true,
    })

    const t1 = placements.find((row) => row.taskId === "t1")
    const t2 = placements.find((row) => row.taskId === "t2")
    assert.equal(t1?.columnId, "need")
    assert.equal(t2?.columnId, "on")
    assert.equal(t2?.boardId, "ops")
  })

  it("clears false archives without moving an already-placed card", () => {
    const created = new Date("2026-09-01T12:00:00.000Z")
    const placements = planOpsTaskPlacements({
      opsBoardId: "ops",
      opsColumns,
      columns: opsColumns,
      tasks: [
        {
          id: "t1",
          boardId: "ops",
          columnId: "need",
          archivedAt: new Date("2026-09-01T12:00:00.200Z"),
          createdAt: created,
        },
      ],
      adoptForeignTasks: false,
    })
    assert.equal(placements.length, 1)
    assert.equal(placements[0].clearArchive, true)
    assert.equal(placements[0].move, false)
  })
})

describe("missingOpsColumnTitles", () => {
  it("adds only the ops columns that are absent", () => {
    assert.deepEqual(missingOpsColumnTitles(["Need you", "Done"]), ["I'm on", "Waiting"])
  })
})
