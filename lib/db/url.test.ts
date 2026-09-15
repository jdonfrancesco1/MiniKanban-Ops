import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { getOpsBoardDatabaseUrl } from "./url.ts"

const HELIUM = "postgresql://ops:s3cret-pass@helium/heliumdb?sslmode=require"
const NEON =
  "postgresql://neondb_owner:npg_secret@ep-cool-name-a1b2.us-east-2.aws.neon.tech/neondb?sslmode=require"

function withEnv(
  values: { OPS_BOARD_DATABASE_URL?: string | undefined; DATABASE_URL?: string | undefined },
  run: () => void,
) {
  const previousOps = process.env.OPS_BOARD_DATABASE_URL
  const previousDb = process.env.DATABASE_URL
  try {
    if (values.OPS_BOARD_DATABASE_URL === undefined) delete process.env.OPS_BOARD_DATABASE_URL
    else process.env.OPS_BOARD_DATABASE_URL = values.OPS_BOARD_DATABASE_URL
    if (values.DATABASE_URL === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = values.DATABASE_URL
    run()
  } finally {
    if (previousOps === undefined) delete process.env.OPS_BOARD_DATABASE_URL
    else process.env.OPS_BOARD_DATABASE_URL = previousOps
    if (previousDb === undefined) delete process.env.DATABASE_URL
    else process.env.DATABASE_URL = previousDb
  }
}

describe("getOpsBoardDatabaseUrl", () => {
  it("prefers OPS_BOARD_DATABASE_URL over DATABASE_URL", () => {
    withEnv({ OPS_BOARD_DATABASE_URL: HELIUM, DATABASE_URL: NEON }, () => {
      assert.equal(getOpsBoardDatabaseUrl(), HELIUM)
    })
  })

  it("falls back to DATABASE_URL when the override is unset", () => {
    withEnv({ OPS_BOARD_DATABASE_URL: undefined, DATABASE_URL: HELIUM }, () => {
      assert.equal(getOpsBoardDatabaseUrl(), HELIUM)
    })
  })

  it("treats a blank OPS_BOARD_DATABASE_URL as unset", () => {
    withEnv({ OPS_BOARD_DATABASE_URL: "   ", DATABASE_URL: NEON }, () => {
      assert.equal(getOpsBoardDatabaseUrl(), NEON)
    })
  })

  it("returns undefined when neither URL is set", () => {
    withEnv({ OPS_BOARD_DATABASE_URL: undefined, DATABASE_URL: undefined }, () => {
      assert.equal(getOpsBoardDatabaseUrl(), undefined)
    })
  })
})
