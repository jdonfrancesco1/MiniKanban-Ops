import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { decidePresentedTenant, decideRequestAuth } from "./decide.ts"
import {
  createTenantCredential,
  mintTenantSecret,
  resolvePresentedSecret,
  verifyTenantCredential,
} from "./credentials.ts"
import { FLEET_UID, identityForTenant } from "./identity.ts"
import { createTenantSessionToken, customerSessionSigningKey, verifyTenantSessionToken } from "./tenant-session.ts"
import { createSessionToken, safeEqual } from "./token.ts"
import { FLEET_TENANT_ID } from "../db/ops-defaults.ts"

const FLEET_SECRET = "fleet-secret-for-tests"
const SIGNING_KEY = "customer-session-signing-key"

function read(path: string) {
  return readFileSync(new URL(path, import.meta.url), "utf8")
}

function executableSql(source: string) {
  const withoutBlock = source.replace(/\/\*[\s\S]*?\*\//g, "")
  return withoutBlock
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
}

describe("per-tenant credentials", () => {
  it("mints a high-entropy secret and stores only HMAC material", async () => {
    const first = mintTenantSecret()
    const second = mintTenantSecret()
    assert.notEqual(first, second)
    assert.ok(first.length >= 43)
    const minted = await createTenantCredential("alpha", first)
    assert.equal(minted.secret, first)
    assert.equal(JSON.stringify(minted.record).includes(first), false)
    assert.notEqual(minted.record.verifier, first)
    assert.notEqual(minted.record.salt, first)
    assert.equal(minted.record.tenantId, "alpha")
  })

  it("rejects a credential for the fleet tenant", async () => {
    await assert.rejects(() => createTenantCredential(FLEET_TENANT_ID), /Invalid tenant id/)
  })

  it("verifies with a timing-safe compare and rejects a same-length wrong secret", async () => {
    const source = read("./credentials.ts")
    assert.match(source, /safeEqual\(computed, record\.verifier\)/)
    assert.doesNotMatch(source, /verifier\s*==/)
    const secret = "a".repeat(43)
    const minted = await createTenantCredential("alpha", secret)
    assert.equal(await verifyTenantCredential(secret, minted.record), true)
    assert.equal(await verifyTenantCredential("b".repeat(43), minted.record), false)
    assert.equal(await verifyTenantCredential(`${secret}x`, minted.record), false)
    assert.equal(safeEqual(secret, "b".repeat(secret.length)), false)
    assert.equal(safeEqual(secret, secret), true)
  })

  it("maps two tenant secrets to two tenants", async () => {
    const alpha = await createTenantCredential("alpha")
    const beta = await createTenantCredential("beta")
    const records = [alpha.record, beta.record]
    const asAlpha = await resolvePresentedSecret({
      presented: alpha.secret,
      fleetSecret: FLEET_SECRET,
      records,
    })
    const asBeta = await resolvePresentedSecret({
      presented: beta.secret,
      fleetSecret: FLEET_SECRET,
      records,
    })
    assert.deepEqual(asAlpha, { tenantId: "alpha", kind: "customer" })
    assert.deepEqual(asBeta, { tenantId: "beta", kind: "customer" })
    assert.notEqual(asAlpha?.tenantId, asBeta?.tenantId)
  })

  it("does not let the fleet secret open a customer tenant", async () => {
    const alpha = await createTenantCredential("alpha")
    const beta = await createTenantCredential("beta", FLEET_SECRET)
    const resolved = await resolvePresentedSecret({
      presented: FLEET_SECRET,
      fleetSecret: FLEET_SECRET,
      records: [alpha.record, beta.record],
    })
    assert.deepEqual(resolved, { tenantId: FLEET_TENANT_ID, kind: "fleet" })
    assert.notEqual(resolved?.tenantId, "alpha")
    assert.notEqual(resolved?.tenantId, "beta")
  })

  it("fails closed when one secret matches more than one customer verifier", async () => {
    const shared = mintTenantSecret()
    const alpha = await createTenantCredential("alpha", shared)
    const beta = await createTenantCredential("beta", shared)
    const resolved = await decidePresentedTenant({
      presented: shared,
      fleetSecret: FLEET_SECRET,
      records: [alpha.record, beta.record],
    })
    assert.equal(resolved, null)
  })

  it("ignores a client-supplied tenant claim", async () => {
    const alpha = await createTenantCredential("alpha")
    const beta = await createTenantCredential("beta")
    const resolved = await resolvePresentedSecret({
      presented: alpha.secret,
      fleetSecret: FLEET_SECRET,
      records: [alpha.record, beta.record],
    })
    assert.equal(resolved?.tenantId, "alpha")
    const authSources = [
      read("./request.ts"),
      read("./decide.ts"),
      read("./session.ts"),
      read("../../middleware.ts"),
      read("../../app/api/auth/login/route.ts"),
      read("../api/ops.ts"),
    ].join("\n")
    assert.doesNotMatch(authSources, /searchParams\.get\(\s*["']tenant/)
    assert.doesNotMatch(authSources, /body\.tenant_id|body\.tenantId/)
    assert.doesNotMatch(authSources, /x-tenant|X-Tenant/)
  })
})

describe("bound sessions", () => {
  it("encodes the tenant and looks it up, and does not use the fixed fleet payload", async () => {
    const alpha = await createTenantCredential("alpha")
    const beta = await createTenantCredential("beta")
    const now = Date.parse("2026-10-06T22:00:00.000Z")
    const token = await createTenantSessionToken({
      tenantId: "alpha",
      signingKey: SIGNING_KEY,
      now,
    })
    assert.equal(token.startsWith("v1."), true)
    assert.equal(token.includes("minikanban-ops-ok"), false)
    const lookedUp = await verifyTenantSessionToken({
      token,
      signingKey: SIGNING_KEY,
      records: [alpha.record, beta.record],
      now,
    })
    assert.deepEqual(lookedUp, { tenantId: "alpha" })
    const missing = await verifyTenantSessionToken({
      token,
      signingKey: SIGNING_KEY,
      records: [beta.record],
      now,
    })
    assert.equal(missing, null)
  })

  it("rejects a tampered tenant id and the fleet fixed-payload cookie", async () => {
    const alpha = await createTenantCredential("alpha")
    const beta = await createTenantCredential("beta")
    const now = Date.parse("2026-10-06T22:00:00.000Z")
    const token = await createTenantSessionToken({
      tenantId: "alpha",
      signingKey: SIGNING_KEY,
      now,
    })
    const [, payload, mac] = token.split(".")
    const body = JSON.parse(Buffer.from(payload.replaceAll("-", "+").replaceAll("_", "/"), "base64").toString()) as {
      tenantId: string
    }
    body.tenantId = "beta"
    const tamperedPayload = Buffer.from(JSON.stringify(body)).toString("base64url")
    const tampered = `v1.${tamperedPayload}.${mac}`
    assert.equal(
      await verifyTenantSessionToken({
        token: tampered,
        signingKey: SIGNING_KEY,
        records: [alpha.record, beta.record],
        now,
      }),
      null,
    )
    const fleetToken = await createSessionToken(FLEET_SECRET)
    assert.equal(
      await verifyTenantSessionToken({
        token: fleetToken,
        signingKey: SIGNING_KEY,
        records: [alpha.record, beta.record],
        now,
      }),
      null,
    )
  })

  it("resolves a customer session to that tenant and keeps uid ops on fleet only", async () => {
    const alpha = await createTenantCredential("alpha")
    const beta = await createTenantCredential("beta")
    const now = Date.parse("2026-10-06T22:00:00.000Z")
    const alphaToken = await createTenantSessionToken({
      tenantId: "alpha",
      signingKey: SIGNING_KEY,
      now,
    })
    const asAlpha = await decideRequestAuth({
      cookie: alphaToken,
      fleetSecret: FLEET_SECRET,
      signingKey: SIGNING_KEY,
      records: [alpha.record, beta.record],
      devGateOpen: false,
      now,
    })
    assert.equal(asAlpha?.tenantId, "alpha")
    assert.notEqual(asAlpha?.uid, FLEET_UID)
    assert.equal(asAlpha?.uid, "tenant:alpha")

    const asFleet = await decideRequestAuth({
      presented: FLEET_SECRET,
      fleetSecret: FLEET_SECRET,
      signingKey: SIGNING_KEY,
      records: [alpha.record, beta.record],
      devGateOpen: false,
      now,
    })
    assert.equal(asFleet?.tenantId, FLEET_TENANT_ID)
    assert.equal(asFleet?.uid, FLEET_UID)

    const fleetCookie = await createSessionToken(FLEET_SECRET)
    const fromFleetCookie = await decideRequestAuth({
      cookie: fleetCookie,
      fleetSecret: FLEET_SECRET,
      signingKey: SIGNING_KEY,
      records: [alpha.record, beta.record],
      devGateOpen: false,
      now,
    })
    assert.equal(fromFleetCookie?.tenantId, FLEET_TENANT_ID)
    assert.equal(fromFleetCookie?.uid, FLEET_UID)
  })

  it("does not let the dev open gate authenticate a customer or run in production", async () => {
    const alpha = await createTenantCredential("alpha")
    const customer = await decideRequestAuth({
      presented: alpha.secret,
      records: [alpha.record],
      devGateOpen: true,
    })
    assert.equal(customer?.tenantId, "alpha")
    assert.notEqual(customer?.uid, FLEET_UID)

    const devAnonymous = await decideRequestAuth({
      records: [],
      devGateOpen: true,
    })
    assert.equal(devAnonymous?.tenantId, FLEET_TENANT_ID)
    assert.equal(devAnonymous?.uid, FLEET_UID)

    const devUnknownBearer = await decideRequestAuth({
      presented: "not-a-customer-secret",
      records: [alpha.record],
      devGateOpen: true,
    })
    assert.equal(devUnknownBearer, null)

    const devBadCustomerCookie = await decideRequestAuth({
      cookie: "v1.not-a-session.mac",
      signingKey: SIGNING_KEY,
      records: [alpha.record],
      devGateOpen: true,
    })
    assert.equal(devBadCustomerCookie, null)

    const productionMissing = await decideRequestAuth({
      records: [],
      devGateOpen: false,
    })
    assert.equal(productionMissing, null)

    assert.equal(customerSessionSigningKey({ OPS_TENANT_SESSION_SECRET: "", OPS_BOARD_SECRET: FLEET_SECRET }), null)
    assert.equal(
      customerSessionSigningKey({
        OPS_TENANT_SESSION_SECRET: FLEET_SECRET,
        OPS_BOARD_SECRET: FLEET_SECRET,
      }),
      null,
    )
    assert.equal(
      customerSessionSigningKey({
        OPS_TENANT_SESSION_SECRET: SIGNING_KEY,
        OPS_BOARD_SECRET: FLEET_SECRET,
      }),
      SIGNING_KEY,
    )
  })

  it("keeps the synthetic ops uid on the fleet tenant only", () => {
    assert.equal(identityForTenant(FLEET_TENANT_ID).uid, "ops")
    assert.equal(identityForTenant("alpha").uid, "tenant:alpha")
    assert.notEqual(identityForTenant("ops").uid, "ops")
  })
})

describe("tenant credential migration", () => {
  const source = read("../../drizzle/0005_tenant_credentials.sql")
  const sql = executableSql(source)

  it("stores verifier material, blocks the fleet tenant, and does not enable RLS", () => {
    assert.match(sql, /CREATE TABLE IF NOT EXISTS tenant_credentials/)
    assert.match(sql, /verifier text NOT NULL/)
    assert.match(sql, /tenant_id <> 'fleet'/)
    assert.match(source, /Plaintext secrets are not stored|plaintext tenant secret is not a column/i)
    assert.doesNotMatch(sql, /ENABLE ROW LEVEL SECURITY/)
    assert.doesNotMatch(sql, /FORCE ROW LEVEL SECURITY/)
    assert.doesNotMatch(sql, /GRANT /i)
    assert.doesNotMatch(sql, /INSERT /i)
    assert.doesNotMatch(sql, /secret text/i)
    const schema = read("../db/schema.ts")
    assert.match(schema, /tenantCredentials/)
    assert.doesNotMatch(schema, /enableRLS/)
  })
})
