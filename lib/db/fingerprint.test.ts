import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { fingerprintDatabaseUrl } from "./fingerprint.ts"

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
