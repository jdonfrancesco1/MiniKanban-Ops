import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { extractTasksFromBoard, type Board } from "./types.ts"
import { getTaskProject, matchOpsProject, parseProjectPrefix, projectBarClass, upsertProjectLabel } from "./projects.ts"

describe("project prefix and labels", () => {
  it("parses [Project] and Project: title conventions", () => {
    assert.deepEqual(parseProjectPrefix("[Paylyte] Wire x402"), { project: "Paylyte", rest: "Wire x402" })
    assert.deepEqual(parseProjectPrefix("Giant: daily brief"), { project: "Giant", rest: "daily brief" })
    assert.equal(parseProjectPrefix("No prefix here"), null)
  })

  it("prefers a known project label over a title prefix", () => {
    const found = getTaskProject({ title: "[Security] Rotate keys", labels: ["Giant"] })
    assert.equal(found?.project, "Giant")
    assert.equal(found?.source, "label")
    assert.equal(found?.displayTitle, "Rotate keys")
  })

  it("uses a title prefix when labels are empty", () => {
    const found = getTaskProject({ title: "MiniKanban - empty board", labels: [] })
    assert.equal(found?.project, "MiniKanban")
    assert.equal(found?.source, "prefix")
    assert.equal(found?.displayTitle, "empty board")
  })

  it("replaces the previous project label", () => {
    assert.deepEqual(upsertProjectLabel(["Paylyte", "blocked"], "Giant"), ["Giant", "blocked"])
    assert.deepEqual(upsertProjectLabel(["blocked"], null), ["blocked"])
  })

  it("uses a project field when present", () => {
    const found = getTaskProject({ title: "Review the ask", labels: ["Marketing"], project: "James" })
    assert.equal(found?.project, "James")
    assert.equal(found?.source, "field")
    assert.equal(found?.displayTitle, "Review the ask")
  })

  it("maps locked project colors and aliases", () => {
    assert.equal(matchOpsProject("Off Replit/CF"), "Off Replit")
    assert.equal(matchOpsProject("James"), "James")
    assert.equal(projectBarClass("Giant"), "bg-blue-400")
    assert.equal(projectBarClass("Paylyte"), "bg-orange-400")
    assert.equal(projectBarClass("MiniKanban"), "bg-gradient-to-b from-violet-400 to-teal-400")
    assert.equal(projectBarClass("Hangar 18"), "bg-emerald-400")
    assert.equal(projectBarClass("Off Replit"), "bg-slate-400")
    assert.equal(projectBarClass("Security"), "bg-red-400")
    assert.equal(projectBarClass("Marketing"), "bg-fuchsia-400")
    assert.equal(projectBarClass("James"), "bg-amber-300")
  })
})

describe("extractTasksFromBoard", () => {
  it("falls back to activeTasks when nested column.tasks were dropped", () => {
    const board = {
      id: "ops",
      title: "Ops",
      columns: [
        { id: "need", title: "Need you", order: 0, tasks: [] },
        { id: "on", title: "I'm on", order: 1, tasks: [] },
      ],
      activeTasks: [
        { id: "t1", title: "Visible", description: "", labels: ["Paylyte"], columnId: "need", boardId: "ops" },
      ],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      createdBy: "ops",
      sharedWith: [],
    } as Board

    const tasks = extractTasksFromBoard(board)
    assert.equal(tasks.length, 1)
    assert.equal(tasks[0].id, "t1")
    assert.equal(tasks[0].columnId, "need")
  })
})
