import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isMissingRelationColumnError } from "./errors.ts"

describe("missing column errors", () => {
  it("detects a missing brief column from Postgres", () => {
    assert.equal(
      isMissingRelationColumnError(new Error('column "brief" of relation "tasks" does not exist'), "brief"),
      true,
    )
    assert.equal(isMissingRelationColumnError(new Error("Task not found"), "brief"), false)
    assert.equal(isMissingRelationColumnError(new Error('column "title" does not exist'), "brief"), false)
  })

  it("detects a missing completed_at column from Postgres", () => {
    assert.equal(
      isMissingRelationColumnError(
        new Error('column "completed_at" of relation "tasks" does not exist'),
        "completed_at",
      ),
      true,
    )
  })
})
