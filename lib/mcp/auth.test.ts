import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { authorizeMcpRequest } from "./auth.ts"

function headers(map: Record<string, string>) {
  return {
    get(name: string) {
      const found = Object.entries(map).find(([key]) => key.toLowerCase() === name.toLowerCase())
      return found?.[1] ?? null
    },
  }
}

describe("MCP auth", () => {
  it("rejects when the gate secret is set and no header is sent", () => {
    const result = authorizeMcpRequest(headers({}), "ops-secret")
    assert.equal(result.ok, false)
    if (!result.ok) {
      assert.equal(result.status, 401)
      assert.equal(result.error, "Unauthorized")
    }
  })

  it("rejects a wrong bearer token", () => {
    const result = authorizeMcpRequest(headers({ authorization: "Bearer nope" }), "ops-secret")
    assert.equal(result.ok, false)
  })

  it("accepts Authorization Bearer matching OPS_BOARD_SECRET", () => {
    const result = authorizeMcpRequest(headers({ authorization: "Bearer ops-secret" }), "ops-secret")
    assert.equal(result.ok, true)
    if (result.ok) {
      assert.equal(result.tenantId, "fleet")
      assert.equal(result.uid, "ops")
    }
  })

  it("accepts the existing X-Ops-Board-Secret header", () => {
    const result = authorizeMcpRequest(headers({ "x-ops-board-secret": "ops-secret" }), "ops-secret")
    assert.equal(result.ok, true)
  })

  it("stays open when no server secret is configured", () => {
    const result = authorizeMcpRequest(headers({}), "")
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.tenantId, "fleet")
  })

  it("fails closed in production when the fleet secret is unset", () => {
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = "production"
    try {
      const result = authorizeMcpRequest(headers({}), "")
      assert.equal(result.ok, false)
      if (!result.ok) assert.equal(result.status, 401)
    } finally {
      process.env.NODE_ENV = previous
    }
  })
})
