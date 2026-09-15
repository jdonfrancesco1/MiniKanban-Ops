import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { fingerprintDatabaseUrl, fingerprintProcessDatabase } from "./fingerprint.ts"

describe("fingerprintDatabaseUrl", () => {
  it("reads Replit Helium host + heliumdb without leaking the secret URI", () => {
    const fp = fingerprintDatabaseUrl("postgresql://ops:s3cret-pass@helium/heliumdb?sslmode=require")
    assert.deepEqual(fp, { dbHostSuffix: "helium", dbName: "heliumdb" })
  })

  it("collapses Neon hostnames to neon.tech so Autoscale mismatch is obvious", () => {
    const fp = fingerprintDatabaseUrl(
      "postgresql://neondb_owner:npg_secret@ep-cool-name-a1b2.us-east-2.aws.neon.tech/neondb?sslmode=require",
    )
    assert.deepEqual(fp, { dbHostSuffix: "neon.tech", dbName: "neondb" })
    assert.equal(fp.dbHostSuffix.includes("ep-"), false)
  })

  it("never echoes user, password, or the raw connection string", () => {
    const raw = "postgresql://ops:super-secret@helium/heliumdb"
    const serialized = JSON.stringify(fingerprintDatabaseUrl(raw))
    assert.equal(serialized.includes("super-secret"), false)
    assert.equal(serialized.includes("ops:"), false)
    assert.equal(serialized.includes("postgresql://"), false)
  })

  it("marks a missing DATABASE_URL without throwing", () => {
    assert.deepEqual(fingerprintDatabaseUrl(undefined), { dbHostSuffix: "unset", dbName: "unset" })
    assert.deepEqual(fingerprintDatabaseUrl(""), { dbHostSuffix: "unset", dbName: "unset" })
  })

  it("does not throw on garbage input", () => {
    assert.deepEqual(fingerprintDatabaseUrl("not-a-url"), { dbHostSuffix: "unparsed", dbName: "unparsed" })
  })
})

describe("fingerprintProcessDatabase", () => {
  const previousOps = process.env.OPS_BOARD_DATABASE_URL
  const previousDb = process.env.DATABASE_URL

  function restoreEnv() {
    if (previousOps === undefined) delete process.env.OPS_BOARD_DATABASE_URL
    else process.env.OPS_BOARD_DATABASE_URL = previousOps
    if (previousDb === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousDb
  }

  it("fingerprints OPS_BOARD_DATABASE_URL when both env vars are set", () => {
    process.env.OPS_BOARD_DATABASE_URL = "postgresql://ops:s3cret-pass@helium/heliumdb"
    process.env.DATABASE_URL =
      "postgresql://neondb_owner:npg_secret@ep-cool-name-a1b2.us-east-2.aws.neon.tech/neondb"
    try {
      assert.deepEqual(fingerprintProcessDatabase(), { dbHostSuffix: "helium", dbName: "heliumdb" })
    } finally {
      restoreEnv()
    }
  })

  it("fingerprints DATABASE_URL when the override is unset", () => {
    delete process.env.OPS_BOARD_DATABASE_URL
    process.env.DATABASE_URL = "postgresql://ops:s3cret-pass@helium/heliumdb"
    try {
      assert.deepEqual(fingerprintProcessDatabase(), { dbHostSuffix: "helium", dbName: "heliumdb" })
    } finally {
      restoreEnv()
    }
  })
})
