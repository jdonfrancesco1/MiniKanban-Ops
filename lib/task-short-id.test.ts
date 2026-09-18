import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { findTasksByRef, taskRefMatches, taskShortId } from "./task-short-id.ts"

describe("taskShortId", () => {
  it("shortens a DB UUID to MKB- plus the first 8 hex chars", () => {
    assert.equal(taskShortId("7e3a1234-5678-4abc-8def-0123456789ab"), "MKB-7E3A1234")
    assert.equal(taskShortId("7E3A1234-5678-4ABC-8DEF-0123456789AB"), "MKB-7E3A1234")
  })

  it("is stable and derived from the existing id, not a second stored key", () => {
    const id = "c0ffee00-1111-4222-8333-444444444444"
    assert.equal(taskShortId(id), taskShortId(id))
    assert.equal(taskShortId(id), "MKB-C0FFEE00")
  })

  it("derives a readable MKB- token from non-UUID preview ids", () => {
    assert.equal(taskShortId("done-rotate"), "MKB-DONEROTA")
    assert.equal(taskShortId("paylyte"), "MKB-PAYLYTE0")
  })
})

describe("taskRefMatches", () => {
  const uuid = "7e3a1234-5678-4abc-8def-0123456789ab"

  it("accepts the full UUID, canonical short id, and unique prefix like MKB-7E3A", () => {
    assert.equal(taskRefMatches(uuid, uuid), true)
    assert.equal(taskRefMatches(uuid, "MKB-7E3A1234"), true)
    assert.equal(taskRefMatches(uuid, "mkb-7e3a1234"), true)
    assert.equal(taskRefMatches(uuid, "MKB-7E3A"), true)
    assert.equal(taskRefMatches(uuid, "7E3A1234"), true)
    assert.equal(taskRefMatches(uuid, "MKB-FFFF0000"), false)
  })

  it("finds a unique match among a board of cards", () => {
    const tasks = [{ id: uuid }, { id: "c0ffee00-1111-4222-8333-444444444444" }]
    assert.deepEqual(
      findTasksByRef(tasks, "MKB-7E3A").map((task) => task.id),
      [uuid],
    )
    assert.equal(findTasksByRef(tasks, "missing").length, 0)
  })
})
