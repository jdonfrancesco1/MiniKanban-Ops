import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  backfillCompletedAt,
  formatOpsDate,
  formatOpsDateLine,
  isDoneColumnTitle,
  nextCompletedAt,
} from "./task-dates.ts"

describe("ops display dates", () => {
  it("formats America/New_York short dates without raw ISO", () => {
    assert.equal(formatOpsDate("2026-09-15T16:00:00.000Z", "card"), "Sep 15")
    assert.equal(formatOpsDate("2026-09-15T16:00:00.000Z", "detail"), "Sep 15, 2026")
    assert.equal(formatOpsDate("2026-09-15T03:00:00.000Z", "card"), "Sep 14")
    assert.equal(formatOpsDate(null, "detail"), "")
  })

  it("builds a muted card line and a Done line with both dates", () => {
    assert.equal(
      formatOpsDateLine({ createdAt: "2026-09-14T16:00:00.000Z", style: "card" }),
      "Created Sep 14",
    )
    assert.equal(
      formatOpsDateLine({
        createdAt: "2026-09-14T16:00:00.000Z",
        completedAt: "2026-09-15T16:00:00.000Z",
        showCompleted: true,
        style: "card",
      }),
      "Created Sep 14 · Completed Sep 15",
    )
    assert.equal(
      formatOpsDateLine({
        createdAt: "2026-09-14T16:00:00.000Z",
        completedAt: "2026-09-15T16:00:00.000Z",
        showCompleted: true,
        style: "detail",
      }),
      "Created Sep 14, 2026 · Completed Sep 15, 2026",
    )
  })
})

describe("Done completion stamps", () => {
  it("recognizes the Done column only", () => {
    assert.equal(isDoneColumnTitle("Done"), true)
    assert.equal(isDoneColumnTitle(" done "), true)
    assert.equal(isDoneColumnTitle("Need you"), false)
  })

  it("stamps on enter Done and clears on leave", () => {
    const now = new Date("2026-09-15T16:00:00.000Z")
    assert.equal(nextCompletedAt({ fromTitle: "Need you", toTitle: "Done", now })?.toISOString(), now.toISOString())
    assert.equal(nextCompletedAt({ fromTitle: "Done", toTitle: "I'm on", now }), null)
    assert.equal(nextCompletedAt({ fromTitle: "Need you", toTitle: "Waiting", now }), undefined)
    assert.equal(nextCompletedAt({ fromTitle: "Done", toTitle: "Done", now }), undefined)
  })

  it("backfills missing Done completedAt from updatedAt", () => {
    const updated = new Date("2026-09-10T16:00:00.000Z")
    assert.equal(
      backfillCompletedAt({ columnTitle: "Done", completedAt: null, updatedAt: updated })?.toISOString(),
      updated.toISOString(),
    )
    assert.equal(
      backfillCompletedAt({
        columnTitle: "Done",
        completedAt: "2026-09-15T16:00:00.000Z",
        updatedAt: updated,
      })?.toISOString(),
      "2026-09-15T16:00:00.000Z",
    )
    assert.equal(backfillCompletedAt({ columnTitle: "Need you", completedAt: null, updatedAt: updated }), null)
  })
})
