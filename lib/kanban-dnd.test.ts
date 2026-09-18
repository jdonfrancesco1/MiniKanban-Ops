import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  applyTaskDragOver,
  columnDroppableId,
  completedAtForColumnMove,
  pickPreferredCollision,
  placeTask,
  placeTaskBefore,
  resolveOverColumnId,
  resolvePersistedDrop,
  sortByOrder,
  type PlaceableTask,
} from "./kanban-dnd.ts"

const columnIds = ["need", "on", "done"]

function task(id: string, columnId: string, order: number, extra: Partial<PlaceableTask> = {}): PlaceableTask {
  return { id, columnId, order, ...extra }
}

function board(): PlaceableTask[] {
  return [
    task("a", "need", 0),
    task("b", "need", 1),
    task("c", "need", 2),
    task("d", "on", 0),
    task("e", "done", 0),
  ]
}

function idsIn(columnId: string, tasks: PlaceableTask[]) {
  return sortByOrder(tasks.filter((item) => item.columnId === columnId)).map((item) => item.id)
}

describe("placeTask / placeTaskBefore", () => {
  it("moves a card to Done and appends when destIndex is past the end", () => {
    const next = placeTask(board(), { taskId: "a", destColumnId: "done", destIndex: 99 })
    assert.deepEqual(idsIn("need", next), ["b", "c"])
    assert.deepEqual(idsIn("done", next), ["e", "a"])
    assert.equal(next.find((item) => item.id === "a")?.columnId, "done")
    assert.equal(next.find((item) => item.id === "a")?.order, 1)
    assert.equal(next.find((item) => item.id === "b")?.order, 0)
  })

  it("inserts above an existing Done card via beforeTaskId", () => {
    const next = placeTaskBefore(board(), { taskId: "b", destColumnId: "done", beforeTaskId: "e" })
    assert.deepEqual(idsIn("done", next), ["b", "e"])
    assert.deepEqual(idsIn("need", next), ["a", "c"])
  })

  it("reorders within a column up and down", () => {
    const down = placeTask(board(), { taskId: "a", destColumnId: "need", destIndex: 2 })
    assert.deepEqual(idsIn("need", down), ["b", "c", "a"])

    const up = placeTask(board(), { taskId: "c", destColumnId: "need", destIndex: 0 })
    assert.deepEqual(idsIn("need", up), ["c", "a", "b"])
  })

  it("returns the same array when the card is already at that index", () => {
    const tasks = board()
    assert.equal(placeTask(tasks, { taskId: "a", destColumnId: "need", destIndex: 0 }), tasks)
    assert.equal(placeTaskBefore(tasks, { taskId: "a", destColumnId: "need", beforeTaskId: "b" }), tasks)
  })

  it("keeps hidden siblings in place when inserting before a visible card", () => {
    const tasks = [
      task("hidden", "need", 0),
      task("visible-1", "need", 1),
      task("visible-2", "need", 2),
      task("moving", "on", 0),
    ]
    const next = placeTaskBefore(tasks, {
      taskId: "moving",
      destColumnId: "need",
      beforeTaskId: "visible-2",
    })
    assert.deepEqual(idsIn("need", next), ["hidden", "visible-1", "moving", "visible-2"])
  })

  it("stamps completedAt when the caller provides it", () => {
    const next = placeTask(board(), {
      taskId: "a",
      destColumnId: "done",
      destIndex: 1,
      completedAt: "2026-09-18T18:00:00.000Z",
    })
    assert.equal(next.find((item) => item.id === "a")?.completedAt, "2026-09-18T18:00:00.000Z")
  })
})

describe("applyTaskDragOver", () => {
  it("snaps the card in front of the hovered task, including across columns", () => {
    const next = applyTaskDragOver(board(), {
      activeId: "a",
      overId: "e",
      overType: "task",
      overColumnId: "done",
      columnIds,
    })
    assert.deepEqual(idsIn("done", next), ["a", "e"])
    assert.deepEqual(idsIn("need", next), ["b", "c"])
  })

  it("appends when hovering another column's empty droppable, but not when hovering the current column chrome", () => {
    const toOn = applyTaskDragOver(board(), {
      activeId: "a",
      overId: columnDroppableId("on"),
      overType: "column",
      columnIds,
    })
    assert.deepEqual(idsIn("on", toOn), ["d", "a"])

    const original = board()
    const same = applyTaskDragOver(original, {
      activeId: "a",
      overId: "need",
      overType: "column",
      columnIds,
    })
    assert.equal(same, original)
    assert.deepEqual(idsIn("need", same), ["a", "b", "c"])

    const toEnd = applyTaskDragOver(original, {
      activeId: "a",
      overId: columnDroppableId("need"),
      overType: "column",
      columnIds,
    })
    assert.deepEqual(idsIn("need", toEnd), ["b", "c", "a"])
  })

  it("ignores hovering the active card itself", () => {
    const tasks = board()
    assert.equal(
      applyTaskDragOver(tasks, {
        activeId: "a",
        overId: "a",
        overType: "task",
        overColumnId: "need",
        columnIds,
      }),
      tasks,
    )
  })
})

describe("resolvePersistedDrop", () => {
  it("describes a Done move with the following sibling as beforeTaskId", () => {
    const original = board()
    const next = placeTaskBefore(original, { taskId: "a", destColumnId: "done", beforeTaskId: "e" })
    assert.deepEqual(resolvePersistedDrop(original, next, "a"), {
      taskId: "a",
      destColumnId: "done",
      sourceColumnId: "need",
      destIndex: 0,
      beforeTaskId: "e",
    })
  })

  it("returns null when nothing moved so the client can skip persist", () => {
    const tasks = board()
    assert.equal(resolvePersistedDrop(tasks, tasks, "a"), null)
    assert.equal(resolvePersistedDrop(tasks, placeTask(tasks, { taskId: "a", destColumnId: "need", destIndex: 0 }), "a"), null)
  })
})

describe("collision helpers", () => {
  it("prefers a task hit when the pointer also intersects a column", () => {
    const picked = pickPreferredCollision(
      [{ id: "need" }, { id: "b" }, { id: columnDroppableId("need") }],
      columnIds,
    )
    assert.deepEqual(picked, [{ id: "b" }])
  })

  it("resolves column ids from droppable prefixes and over data", () => {
    assert.equal(resolveOverColumnId({ overId: columnDroppableId("done"), columnIds }), "done")
    assert.equal(resolveOverColumnId({ overId: "misc", overColumnId: "on", columnIds }), "on")
    assert.equal(resolveOverColumnId({ overId: "done", overType: "column", columnIds }), "done")
    assert.equal(resolveOverColumnId({ overId: "unknown", columnIds }), null)
  })
})

describe("completedAtForColumnMove", () => {
  it("stamps when entering Done and clears when leaving", () => {
    const now = new Date("2026-09-18T18:00:00.000Z")
    assert.equal(completedAtForColumnMove({ fromTitle: "Need you", toTitle: "Done", now }), now.toISOString())
    assert.equal(completedAtForColumnMove({ fromTitle: "Done", toTitle: "I'm on", now }), null)
    assert.equal(completedAtForColumnMove({ fromTitle: "Need you", toTitle: "I'm on", now }), undefined)
  })
})
