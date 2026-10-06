import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { scopeToRequest } from "./request-scope.ts"

describe("request-scoped database client", () => {
  it("reuses one client per request and closes it only after the response is released", async () => {
    const cache = new WeakMap<object, { id: number }>()
    const closed: number[] = []
    const pending: Promise<unknown>[] = []
    let nextId = 0

    function open(ctx: { waitUntil: (promise: Promise<unknown>) => void }, releaseNow: boolean) {
      let release!: () => void
      const value = scopeToRequest(
        ctx,
        cache,
        () => {
          const id = ++nextId
          return {
            value: { id },
            close: async () => {
              closed.push(id)
            },
          }
        },
        (done) => {
          release = done
          if (releaseNow) done()
        },
      )
      return { value, release }
    }

    const ctxA = {
      waitUntil(promise: Promise<unknown>) {
        pending.push(promise)
      },
    }

    const first = open(ctxA, false)
    const again = open(ctxA, false)
    assert.equal(again.value, first.value)
    assert.deepEqual(closed, [])

    const pendingB: Promise<unknown>[] = []
    const ctxB = {
      waitUntil(promise: Promise<unknown>) {
        pendingB.push(promise)
      },
    }
    const other = open(ctxB, true)
    assert.notEqual(other.value.id, first.value.id)
    await Promise.all(pendingB)
    assert.deepEqual(closed, [other.value.id])

    first.release()
    await Promise.all(pending)
    assert.deepEqual(closed, [other.value.id, first.value.id])
  })

  it("does not open a client when the response hook cannot be registered", () => {
    const cache = new WeakMap<object, number>()
    const ctx = {
      waitUntil() {
        throw new Error("should not wait")
      },
    }
    assert.throws(
      () =>
        scopeToRequest(
          ctx,
          cache,
          () => {
            throw new Error("should not create")
          },
          () => {
            throw new Error("no after")
          },
        ),
      /no after/,
    )
    assert.equal(cache.get(ctx), undefined)
  })

  it("does not keep a process-wide pg Pool on globalThis", () => {
    const source = readFileSync(new URL("./index.ts", import.meta.url), "utf8")
    assert.equal(source.includes("globalThis"), false)
    assert.equal(source.includes("new Pool"), false)
    assert.equal(source.includes("new Client"), true)
    assert.equal(source.includes("ctx.waitUntil"), true)
  })
})
