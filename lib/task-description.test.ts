import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { EMPTY_DESCRIPTION_PLACEHOLDER, descriptionIsMissing, requireTaskDescription } from "./task-description.ts"

describe("task description", () => {
  it("rejects empty and placeholder copy", () => {
    assert.equal(descriptionIsMissing(""), true)
    assert.equal(descriptionIsMissing("   "), true)
    assert.equal(descriptionIsMissing(null), true)
    assert.equal(descriptionIsMissing("<p><br></p>"), true)
    assert.equal(descriptionIsMissing(EMPTY_DESCRIPTION_PLACEHOLDER), true)
    assert.equal(descriptionIsMissing("  No description yet. Edit the card to add the full ask.  "), true)
    assert.equal(descriptionIsMissing("Add a detailed description..."), true)
  })

  it("accepts a real ask and returns the trimmed original", () => {
    assert.equal(descriptionIsMissing("Confirm the Paylyte page still charges."), false)
    assert.equal(requireTaskDescription("  Confirm the Paylyte page still charges.  "), "Confirm the Paylyte page still charges.")
    assert.throws(
      () => requireTaskDescription(EMPTY_DESCRIPTION_PLACEHOLDER),
      /Description is required/,
    )
  })
})
