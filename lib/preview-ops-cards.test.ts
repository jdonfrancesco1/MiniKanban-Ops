import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { getTaskProject, projectBarClass, projectChipClass } from "./projects.ts"

describe("ops card preview fixtures", () => {
  it("includes Marketing (fuchsia) and Security (red) cards", () => {
    const source = readFileSync(new URL("./preview-ops-cards.ts", import.meta.url), "utf8")
    assert.match(source, /title: "\[Marketing\]/)
    assert.match(source, /title: "\[Security\]/)
    assert.match(source, /labels: \["Marketing"\]/)
    assert.match(source, /labels: \["Security"\]/)

    const marketing = getTaskProject({ title: "[Marketing] Launch Friday note", labels: ["Marketing"] })
    const security = getTaskProject({ title: "[Security] Rotate ops secrets", labels: ["Security"] })
    assert.equal(marketing?.known, "Marketing")
    assert.equal(security?.known, "Security")
    assert.match(projectChipClass("Marketing"), /fuchsia/)
    assert.match(projectBarClass("Security"), /red/)
  })

  it("includes Maven (indigo) and Orca (cyan) cards", () => {
    const source = readFileSync(new URL("./preview-ops-cards.ts", import.meta.url), "utf8")
    assert.match(source, /title: "\[Maven\]/)
    assert.match(source, /title: "\[Orca\]/)
    assert.match(source, /labels: \["Maven"\]/)
    assert.match(source, /labels: \["Orca"\]/)

    const maven = getTaskProject({ title: "[Maven] Paylyte X posts today", labels: ["Maven"] })
    const orca = getTaskProject({ title: "[Orca] MiniKanban worker secrets", labels: ["Orca"] })
    assert.equal(maven?.known, "Maven")
    assert.equal(orca?.known, "Orca")
    assert.match(projectChipClass("Maven"), /indigo/)
    assert.match(projectBarClass("Orca"), /cyan/)
    assert.notEqual(projectChipClass("Maven"), projectChipClass("Orca"))
    assert.notEqual(projectChipClass("Maven"), "bg-white/15 text-white border-white/25")
    assert.notEqual(projectChipClass("Orca"), "bg-white/15 text-white border-white/25")
  })

  it("includes created dates and a Done card with completedAt", () => {
    const source = readFileSync(new URL("./preview-ops-cards.ts", import.meta.url), "utf8")
    assert.match(source, /createdAt: "2026-09-14T16:00:00.000Z"/)
    assert.match(source, /completedAt: "2026-09-15T16:00:00.000Z"/)
    assert.match(source, /columnId: "done"/)
  })
})
