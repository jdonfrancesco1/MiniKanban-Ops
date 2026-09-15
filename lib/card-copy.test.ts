import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  GIANT_SMOKE_CARDS,
  briefFromDescription,
  cardFaceBrief,
  matchGiantSmokeCard,
  planGiantSmokeBackfill,
} from "./card-copy.ts"

describe("Giant smoke card matching", () => {
  const cases = [
    ["[Giant] Library", "library"],
    ["Giant: Library list", "library"],
    ["Sticky Ask", "sticky-ask"],
    ["Giant DC Sticky Ask", "sticky-ask"],
    ["Capture +", "capture"],
    ["Capture+", "capture"],
    ["Scope", "scope"],
    ["Share", "share"],
    ["Share default off", "share"],
    ["Attribution", "attribution"],
    ["Passkey", "passkey"],
    ["Passkey escape", "passkey"],
    ["Voice Play Back", "voice-play-back"],
    ["Auto Face ID", "auto-face-id"],
    ["[Giant] Face ID", "auto-face-id"],
  ] as const

  for (const [title, id] of cases) {
    it(`matches ${title} → ${id}`, () => {
      assert.equal(matchGiantSmokeCard(title)?.id, id)
    })
  }

  it("does not treat Attribution as Share", () => {
    assert.equal(matchGiantSmokeCard("Attribution")?.id, "attribution")
    assert.notEqual(matchGiantSmokeCard("Attribution")?.id, "share")
  })

  it("ignores unrelated titles", () => {
    assert.equal(matchGiantSmokeCard("Wire x402 Paylyte"), null)
  })
})

describe("locked Need you copy", () => {
  it("has the nine smoke briefs and descriptions James locked", () => {
    assert.equal(GIANT_SMOKE_CARDS.length, 9)
    assert.equal(
      matchGiantSmokeCard("Library")?.brief,
      "Open Library — see recent memories, not blank.",
    )
    assert.equal(
      matchGiantSmokeCard("Library")?.description,
      "On DeepCore Companion tip e9e831d: Open Library. Confirm you see your recent memories (at least a handful), not a blank list. Say PASS or what failed.",
    )
    assert.equal(matchGiantSmokeCard("Sticky Ask")?.brief, "Today: Ask stays one row while you scroll.")
    assert.equal(matchGiantSmokeCard("Capture +")?.brief, "Bottom + is Capture only — no second big circle.")
    assert.equal(matchGiantSmokeCard("Scope")?.brief, "Mine / Team / Everything actually changes the list.")
    assert.equal(matchGiantSmokeCard("Share")?.brief, "New capture: Share defaults OFF.")
    assert.equal(matchGiantSmokeCard("Attribution")?.brief, "Shared memory shows who remembered it.")
    assert.equal(matchGiantSmokeCard("Passkey")?.brief, "After saving a passkey, you can leave the screen.")
    assert.equal(matchGiantSmokeCard("Voice Play Back")?.brief, "Record → Play Back hears YOUR audio → Remember.")
    assert.equal(
      matchGiantSmokeCard("Auto Face ID")?.brief,
      "With Face ID lock on, open app → Face ID prompts itself.",
    )
  })
})

describe("planGiantSmokeBackfill", () => {
  it("fills empty brief and description and stamps Giant", () => {
    const plan = planGiantSmokeBackfill({ title: "Library", brief: "", description: "", labels: [] })
    assert.ok(plan)
    assert.equal(plan.brief, "Open Library — see recent memories, not blank.")
    assert.ok(plan.description.includes("e9e831d"))
    assert.deepEqual(plan.labels, ["Giant"])
  })

  it("does not stomp a later custom description", () => {
    const plan = planGiantSmokeBackfill({
      title: "Library",
      brief: "My own brief",
      description: "James wrote this himself.",
      labels: ["Giant"],
    })
    assert.equal(plan, null)
  })

  it("refreshes previous locked copy", () => {
    const plan = planGiantSmokeBackfill({
      title: "Library",
      brief: "Open Library — see recent memories, not blank.",
      description: "",
      labels: ["Giant"],
    })
    assert.ok(plan)
    assert.ok(plan.description.includes("PASS or what failed"))
  })
})

describe("card face brief", () => {
  it("prefers the brief field", () => {
    assert.equal(cardFaceBrief({ brief: "On the card", description: "Longer ask." }), "On the card")
  })

  it("falls back to a 1–2 line description excerpt", () => {
    const brief = briefFromDescription("First sentence. Second sentence. Third should drop.")
    assert.equal(brief, "First sentence. Second sentence.")
  })
})
