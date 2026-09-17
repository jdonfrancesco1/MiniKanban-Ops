import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"
import { extractTasksFromBoard, type Board } from "./types.ts"
import {
  OPS_PROJECTS,
  filterTasksByProject,
  getTaskProject,
  matchOpsProject,
  opsProjectTailwindSafelist,
  parseProjectFilter,
  parseProjectPrefix,
  projectBarClass,
  taskMatchesProjectFilter,
  projectCardChrome,
  projectChipClass,
  projectPaint,
  projectRailStyle,
  upsertProjectLabel,
} from "./projects.ts"

describe("project prefix and labels", () => {
  it("parses [Project] and Project: title conventions", () => {
    assert.deepEqual(parseProjectPrefix("[Paylyte] Wire x402"), { project: "Paylyte", rest: "Wire x402" })
    assert.deepEqual(parseProjectPrefix("Giant: daily brief"), { project: "Giant", rest: "daily brief" })
    assert.equal(parseProjectPrefix("No prefix here"), null)
  })

  it("prefers a known project label over a title prefix", () => {
    const found = getTaskProject({ title: "[Security] Rotate keys", labels: ["Giant"] })
    assert.equal(found?.project, "Giant")
    assert.equal(found?.source, "label")
    assert.equal(found?.displayTitle, "Rotate keys")
  })

  it("uses a title prefix when labels are empty", () => {
    const found = getTaskProject({ title: "MiniKanban - empty board", labels: [] })
    assert.equal(found?.project, "MiniKanban")
    assert.equal(found?.source, "prefix")
    assert.equal(found?.displayTitle, "empty board")
  })

  it("replaces the previous project label", () => {
    assert.deepEqual(upsertProjectLabel(["Paylyte", "blocked"], "Giant"), ["Giant", "blocked"])
    assert.deepEqual(upsertProjectLabel(["blocked"], null), ["blocked"])
  })

  it("uses a project field when present", () => {
    const found = getTaskProject({ title: "Review the ask", labels: ["Marketing"], project: "Jimbo" })
    assert.equal(found?.project, "Jimbo")
    assert.equal(found?.source, "field")
    assert.equal(found?.displayTitle, "Review the ask")
  })

  it("resolves a legacy James project field or label to Jimbo", () => {
    const fromField = getTaskProject({ title: "Review the ask", labels: ["Marketing"], project: "James" })
    assert.equal(fromField?.project, "Jimbo")
    assert.equal(fromField?.known, "Jimbo")
    const fromLabel = getTaskProject({ title: "[James] Review Friday asks", labels: ["James"] })
    assert.equal(fromLabel?.project, "Jimbo")
    assert.equal(fromLabel?.known, "Jimbo")
    assert.equal(fromLabel?.displayTitle, "Review Friday asks")
  })

  it("maps locked project colors and aliases", () => {
    assert.equal(matchOpsProject("Off Replit/CF"), "Off Replit")
    assert.equal(matchOpsProject("Jimbo"), "Jimbo")
    assert.equal(matchOpsProject("James"), "Jimbo")
    assert.equal(matchOpsProject("Maven"), "Maven")
    assert.equal(matchOpsProject("Orca"), "Orca")
    assert.equal(matchOpsProject("maven"), "Maven")
    assert.equal(matchOpsProject("orca"), "Orca")
    assert.equal(projectBarClass("Giant"), "bg-blue-400")
    assert.equal(projectBarClass("Paylyte"), "bg-orange-400")
    assert.equal(projectBarClass("MiniKanban"), "bg-gradient-to-b from-violet-400 to-teal-400")
    assert.equal(projectBarClass("Hangar 18"), "bg-emerald-400")
    assert.equal(projectBarClass("Off Replit"), "bg-slate-400")
    assert.equal(projectBarClass("Security"), "bg-red-400")
    assert.equal(projectBarClass("Marketing"), "bg-fuchsia-400")
    assert.equal(projectBarClass("Jimbo"), "bg-amber-300")
    assert.equal(projectBarClass("James"), "bg-amber-300")
    assert.equal(projectBarClass("Maven"), "bg-indigo-400")
    assert.equal(projectBarClass("Orca"), "bg-cyan-400")
  })

  it("colors [Marketing] and [Security] title prefixes", () => {
    const marketing = getTaskProject({ title: "[Marketing] Launch Friday note", labels: [] })
    const security = getTaskProject({ title: "[Security] Rotate ops secrets", labels: [] })
    assert.equal(marketing?.known, "Marketing")
    assert.equal(security?.known, "Security")
    assert.equal(projectChipClass("Marketing"), "bg-fuchsia-500 text-white border-fuchsia-300")
    assert.equal(projectChipClass("Security"), "bg-red-500 text-white border-red-300")
  })

  it("tells Tailwind to scan lib so project color strings are not purged", () => {
    const config = readFileSync(new URL("../tailwind.config.ts", import.meta.url), "utf8")
    assert.match(config, /\.\/lib\/\*\*\/\*\.\{ts,tsx\}/)
    assert.match(config, /safelist:\s*opsProjectTailwindSafelist\(\)/)
  })

  it("pairs a pill paint with a left rail for every known project", () => {
    for (const project of OPS_PROJECTS) {
      const chrome = projectCardChrome(project)
      assert.ok(chrome, `${project} must have card chrome`)
      assert.equal(chrome.known, project)
      assert.ok(chrome.paint.chip, `${project} missing chip paint`)
      assert.ok(chrome.paint.rail, `${project} missing rail paint`)
      assert.ok(chrome.chipStyle?.backgroundColor, `${project} missing chip style`)
      const rail = projectRailStyle(project)
      assert.ok(rail.backgroundColor || rail.backgroundImage, `${project} missing rail style`)
    }
    assert.equal(projectPaint("Security")?.rail, "#f87171")
    assert.equal(projectPaint("Paylyte")?.rail, "#fb923c")
    assert.equal(projectPaint("Marketing")?.chip, "#d946ef")
    assert.equal(projectPaint("Maven")?.chip, "#6366f1")
    assert.equal(projectPaint("Maven")?.rail, "#818cf8")
    assert.equal(projectPaint("Maven")?.ink, "#ffffff")
    assert.equal(projectPaint("Orca")?.chip, "#06b6d4")
    assert.equal(projectPaint("Orca")?.rail, "#22d3ee")
    assert.equal(projectPaint("Orca")?.ink, "#ffffff")
  }

  it("registers Maven and Orca as distinct known projects", () => {
    assert.ok(OPS_PROJECTS.includes("Maven"))
    assert.ok(OPS_PROJECTS.includes("Orca"))
    assert.ok(OPS_PROJECTS.includes("Jimbo"))
    assert.equal((OPS_PROJECTS as readonly string[]).includes("James"), false)

    const paints = OPS_PROJECTS.map((project) => projectPaint(project)!)
    const chipKeys = new Set(paints.map((paint) => paint.chip))
    const railKeys = new Set(paints.map((paint) => paint.rail))
    assert.equal(chipKeys.size, OPS_PROJECTS.length, "each project needs a distinct chip paint")
    assert.equal(railKeys.size, OPS_PROJECTS.length, "each project needs a distinct rail paint")

    assert.equal(projectChipClass("Maven"), "bg-indigo-500 text-white border-indigo-300")
    assert.equal(projectChipClass("Orca"), "bg-cyan-500 text-white border-cyan-300")
    assert.equal(matchOpsProject("MAVEN"), "Maven")
    assert.equal(matchOpsProject("ORCA"), "Orca")
    assert.equal(parseProjectFilter("maven"), "Maven")
    assert.equal(parseProjectFilter("orca"), "Orca")
  })

  it("gives James's Security-labeled card both pill and rail paints", () => {
    const found = getTaskProject({
      title: "BigMofo standing watch — Paylyte/Giant auth+payments",
      labels: ["Security"],
    })
    assert.equal(found?.known, "Security")
    const chrome = projectCardChrome(found?.project)
    assert.equal(chrome?.known, "Security")
    assert.equal(chrome?.paint.chip, "#ef4444")
    assert.equal(chrome?.paint.rail, "#f87171")
  })

  it("filters cards by the same project resolver as the chip", () => {
    const tasks = [
      { id: "1", title: "[Giant] Daily brief", labels: [] },
      { id: "2", title: "Wire x402", labels: ["Paylyte"] },
      { id: "3", title: "No project yet", labels: [] },
      { id: "4", title: "Review the ask", labels: ["Marketing"], project: "James" },
      { id: "5", title: "Paylyte X posts today", labels: ["Maven"] },
      { id: "6", title: "MiniKanban worker secrets", labels: ["Orca"] },
    ]

    assert.equal(parseProjectFilter(null), "all")
    assert.equal(parseProjectFilter("paylyte"), "Paylyte")
    assert.equal(parseProjectFilter("jimbo"), "Jimbo")
    assert.equal(parseProjectFilter("james"), "Jimbo")
    assert.equal(parseProjectFilter("unknown"), "all")

    assert.equal(filterTasksByProject(tasks, "all").length, 6)
    assert.equal(parseProjectFilter("maven"), "Maven")
    assert.equal(parseProjectFilter("orca"), "Orca")
    assert.deepEqual(
      filterTasksByProject(tasks, "Giant").map((task) => task.id),
      ["1"],
    )
    assert.deepEqual(
      filterTasksByProject(tasks, "Paylyte").map((task) => task.id),
      ["2"],
    )
    assert.deepEqual(
      filterTasksByProject(tasks, "Jimbo").map((task) => task.id),
      ["4"],
    )
    assert.deepEqual(
      filterTasksByProject(tasks, "James").map((task) => task.id),
      ["4"],
    )
    assert.deepEqual(
      filterTasksByProject(tasks, "Maven").map((task) => task.id),
      ["5"],
    )
    assert.deepEqual(
      filterTasksByProject(tasks, "Orca").map((task) => task.id),
      ["6"],
    )
    assert.equal(taskMatchesProjectFilter(tasks[2], "Giant"), false)
    assert.equal(taskMatchesProjectFilter(tasks[2], "all"), true)
  })

  it("safelists every project chip, bar, and swatch class token", () => {
    const safelist = opsProjectTailwindSafelist()
    for (const token of [
      "bg-fuchsia-500",
      "border-fuchsia-300",
      "bg-fuchsia-400",
      "bg-red-500",
      "border-red-300",
      "bg-red-400",
      "bg-blue-500",
      "bg-orange-500",
      "bg-teal-600",
      "bg-emerald-500",
      "bg-slate-500",
      "bg-amber-400",
      "from-violet-400",
      "to-teal-400",
      "bg-indigo-500",
      "border-indigo-300",
      "bg-indigo-400",
      "bg-cyan-500",
      "border-cyan-300",
      "bg-cyan-400",
    ]) {
      assert.ok(safelist.includes(token), `missing safelist token ${token}`)
    }
  })
})

describe("extractTasksFromBoard", () => {
  it("falls back to activeTasks when nested column.tasks were dropped", () => {
    const board = {
      id: "ops",
      title: "Ops",
      columns: [
        { id: "need", title: "Need you", order: 0, tasks: [] },
        { id: "on", title: "I'm on", order: 1, tasks: [] },
      ],
      activeTasks: [
        { id: "t1", title: "Visible", description: "", labels: ["Paylyte"], columnId: "need", boardId: "ops" },
      ],
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      createdBy: "ops",
      sharedWith: [],
    } as Board

    const tasks = extractTasksFromBoard(board)
    assert.equal(tasks.length, 1)
    assert.equal(tasks[0].id, "t1")
    assert.equal(tasks[0].columnId, "need")
  })
})
