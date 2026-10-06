import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  CLOSE_SUB_STATUSES,
  closeSubStatusError,
  isCloseSubStatus,
  nextCloseSubStatus,
} from "./close-sub-status.ts"

describe("close sub-status", () => {
  it("allows only Closed, No Longer Needed, and Duplicate", () => {
    assert.deepEqual([...CLOSE_SUB_STATUSES], ["Closed", "No Longer Needed", "Duplicate"])
    assert.equal(isCloseSubStatus("Closed"), true)
    assert.equal(isCloseSubStatus("No Longer Needed"), true)
    assert.equal(isCloseSubStatus("Duplicate"), true)
    assert.equal(isCloseSubStatus("closed"), false)
    assert.equal(isCloseSubStatus("Won't do"), false)
    assert.equal(isCloseSubStatus(""), false)
    assert.equal(isCloseSubStatus(null), false)
  })

  it("requires a sub-status when a card enters Done", () => {
    assert.equal(
      nextCloseSubStatus({ fromTitle: "Need you", toTitle: "Done", closeSubStatus: "No Longer Needed" }),
      "No Longer Needed",
    )
    assert.throws(
      () => nextCloseSubStatus({ fromTitle: "I'm on", toTitle: "Done" }),
      new Error(closeSubStatusError(true)),
    )
    assert.throws(
      () => nextCloseSubStatus({ fromTitle: "Waiting", toTitle: "done", closeSubStatus: "Archived" }),
      /must be one of/,
    )
  })

  it("clears the sub-status when a card leaves Done and keeps it when reordering", () => {
    assert.equal(nextCloseSubStatus({ fromTitle: "Done", toTitle: "Need you", closeSubStatus: "Closed" }), null)
    assert.equal(nextCloseSubStatus({ fromTitle: "Done", toTitle: "Done" }), undefined)
    assert.equal(
      nextCloseSubStatus({ fromTitle: "Done", toTitle: "Done", closeSubStatus: "Duplicate" }),
      "Duplicate",
    )
    assert.equal(nextCloseSubStatus({ fromTitle: "Need you", toTitle: "Waiting" }), undefined)
  })
})
