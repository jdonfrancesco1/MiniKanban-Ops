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
})
