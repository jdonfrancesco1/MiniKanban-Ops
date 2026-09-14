import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { getDb } from "./index.ts"

describe("db client lazy init", () => {
  it("imports without DATABASE_URL and only throws when a connection is needed", () => {
    const previous = process.env.DATABASE_URL
    delete process.env.DATABASE_URL
    try {
      assert.equal(typeof getDb, "function")
      assert.throws(() => getDb(), /DATABASE_URL is not set/)
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL
      else process.env.DATABASE_URL = previous
    }
  })
})
