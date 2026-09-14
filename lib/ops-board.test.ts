import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  extractTasksFromBoard,
  hydrateOpsApiBoard,
  pickBoardWithTasks,
  shouldPreferOpsJsonApi,
  toFlightSafeBoard,
  type Board,
  type OpsApiBoard,
  type Task,
} from "./types.ts"

const sampleTask = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  title: "Ship Helium cards",
  description: "",
  labels: ["MiniKanban"],
  columnId: "need",
  boardId: "ops-id",
  order: 0,
  ...overrides,
})

const sampleBoard = (overrides: Partial<Board> = {}): Board => ({
  id: "ops-id",
  title: "Ops",
  slug: "ops",
  columns: [
    { id: "need", title: "Need you", order: 0, tasks: [sampleTask()] },
    { id: "on", title: "I'm on", order: 1, tasks: [] },
  ],
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
  createdBy: "ops",
  sharedWith: [],
  ...overrides,
})

describe("shouldPreferOpsJsonApi", () => {
  it("prefers /api/ops/board for the ops slug before Flight", () => {
    assert.equal(shouldPreferOpsJsonApi("ops"), true)
    assert.equal(shouldPreferOpsJsonApi("e9fc4dc4-212a-4b8b-b4e7-cf8105ccf3d6", "ops"), true)
    assert.equal(shouldPreferOpsJsonApi("other-board"), false)
  })
})

describe("extractTasksFromBoard Flight recovery", () => {
  it("falls back to activeTasks when nested column.tasks were dropped", () => {
    const tasks = extractTasksFromBoard(
      sampleBoard({
        columns: [
          { id: "need", title: "Need you", order: 0, tasks: [] },
          { id: "on", title: "I'm on", order: 1, tasks: [] },
        ],
        activeTasks: [sampleTask()],
      }),
    )
    assert.equal(tasks.length, 1)
    assert.equal(tasks[0].id, "t1")
    assert.equal(tasks[0].columnId, "need")
  })

  it("recovers from tasksJson after Flight drops both nested tasks and activeTasks", () => {
    const safe = toFlightSafeBoard(sampleBoard())
    const dropped: Board = {
      ...safe,
      activeTasks: undefined,
      columns: safe.columns.map((column) => ({ ...column, tasks: [] })),
    }
    const tasks = extractTasksFromBoard(dropped)
    assert.equal(tasks.length, 1)
    assert.equal(tasks[0].title, "Ship Helium cards")
    assert.equal(tasks[0].columnId, "need")
  })

  it("stamps columnId from column.taskIds when Flight left tasks without a column", () => {
    const tasks = extractTasksFromBoard(
      sampleBoard({
        columns: [{ id: "need", title: "Need you", order: 0, tasks: [], taskIds: ["t1"] }],
        activeTasks: [sampleTask({ columnId: "" })],
      }),
    )
    assert.equal(tasks[0]?.columnId, "need")
  })
})

describe("hydrateOpsApiBoard", () => {
  const apiBoard: OpsApiBoard = {
    id: "e9fc4dc4-212a-4b8b-b4e7-cf8105ccf3d6",
    title: "Ops",
    slug: "ops",
    columns: [
      {
        id: "need",
        title: "Need you",
        order: 0,
        tasks: [
          {
            id: "t1",
            title: "Need a review",
            description: "",
            labels: ["Giant"],
            order: 0,
            columnId: "need",
          },
        ],
      },
      { id: "on", title: "I'm on", order: 1, tasks: [] },
    ],
    activeTasks: [
      {
        id: "t1",
        title: "Need a review",
        description: "",
        labels: ["Giant"],
        order: 0,
        columnId: "need",
      },
    ],
  }

  it("hydrates nested API tasks with column ids the kanban filter can match", () => {
    const board = hydrateOpsApiBoard(apiBoard)
    const tasks = extractTasksFromBoard(board)
    assert.equal(tasks.length, 1)
    assert.equal(tasks[0].columnId, "need")
    assert.equal(board.columns[0].id, "need")
  })

  it("uses top-level activeTasks when the JSON API omitted nested column.tasks", () => {
    const board = hydrateOpsApiBoard({
      ...apiBoard,
      columns: apiBoard.columns.map((column) => ({ ...column, tasks: [] })),
    })
    const tasks = extractTasksFromBoard(board)
    assert.equal(tasks.length, 1)
    assert.equal(board.columns[0].tasks[0]?.id, "t1")
  })
})

describe("pickBoardWithTasks", () => {
  it("prefers a JSON API board that still has cards over an empty Flight shell", () => {
    const api = hydrateOpsApiBoard({
      id: "ops-id",
      title: "Ops",
      slug: "ops",
      columns: [
        {
          id: "need",
          title: "Need you",
          order: 0,
          tasks: [{ id: "t1", title: "Live card", description: "", labels: [], order: 0, columnId: "need" }],
        },
      ],
    })
    const flightEmpty = sampleBoard({
      columns: [{ id: "need", title: "Need you", order: 0, tasks: [] }],
      activeTasks: [],
      tasksJson: "[]",
    })
    const picked = pickBoardWithTasks(api, flightEmpty)
    assert.equal(picked.source, "api")
    assert.equal(extractTasksFromBoard(picked.board).length, 1)
  })

  it("falls back to the server-action board when the JSON API is empty", () => {
    const picked = pickBoardWithTasks(null, sampleBoard())
    assert.equal(picked.source, "server")
    assert.equal(extractTasksFromBoard(picked.board).length, 1)
  })
})
