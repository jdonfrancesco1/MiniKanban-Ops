import assert from "node:assert/strict"
import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, it } from "node:test"
import { MCP_AUTOSCALE_URL } from "./lookup.ts"

const repoRoot = path.resolve(import.meta.dirname, "../..")
const pluginRoot = path.join(repoRoot, "plugins/minikanban-ops")

function readJson(filePath: string) {
  return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>
}

function walk(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    if (statSync(full).isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

describe("minikanban-ops cursor plugin package", () => {
  it("points mcp.json at the live productvision worker with a variable bearer", () => {
    const mcp = readJson(path.join(pluginRoot, "mcp.json"))
    const servers = mcp.mcpServers as Record<string, { type?: string; url?: string; headers?: Record<string, string> }>
    const server = servers["minikanban-ops"]
    assert.ok(server)
    assert.equal(server.type, "http")
    assert.equal(server.url, MCP_AUTOSCALE_URL)
    assert.equal(server.url, "https://minikanban-ops.productvision.workers.dev/mcp")
    assert.equal(server.headers?.Authorization, "Bearer ${OPS_BOARD_SECRET}")
  })

  it("declares OPS_BOARD_SECRET as a required plugin variable and pins mcp.json", () => {
    const manifest = readJson(path.join(pluginRoot, ".cursor-plugin/plugin.json"))
    assert.equal(manifest.name, "minikanban-ops")
    assert.equal(manifest.license, "MIT")
    assert.equal(manifest.logo, "assets/logo.svg")
    assert.equal(manifest.mcpServers, "./mcp.json")
    const variables = manifest.variables as {
      type: string
      required: string[]
      properties: Record<string, { type?: string }>
    }
    assert.equal(variables.type, "object")
    assert.deepEqual(variables.required, ["OPS_BOARD_SECRET"])
    assert.equal(variables.properties.OPS_BOARD_SECRET.type, "string")
    assert.equal("default" in (variables.properties.OPS_BOARD_SECRET as object), false)
  })

  it("is indexed from the repo marketplace manifest", () => {
    const marketplace = readJson(path.join(repoRoot, ".cursor-plugin/marketplace.json"))
    const plugins = marketplace.plugins as Array<{ name: string; source: string }>
    assert.equal(plugins.length, 1)
    assert.equal(plugins[0].name, "minikanban-ops")
    assert.equal(plugins[0].source, "./plugins/minikanban-ops")
  })

  it("documents the four columns and does not ship secrets or foreign hosts", () => {
    const skill = readFileSync(path.join(pluginRoot, "skills/minikanban-ops-board/SKILL.md"), "utf8")
    for (const column of ["Need you", "I'm on", "Waiting", "Done"]) {
      assert.ok(skill.includes(column), column)
    }
    assert.match(skill, /^---\r?\nname: minikanban-ops-board\r?\n/)
    assert.match(skill, /inline \*\*Task List\*\*/)
    assert.match(skill, /docs\/grok-bot-task-list\.md/)
    const guide = readFileSync(path.join(pluginRoot, "docs/grok-bot-task-list.md"), "utf8")
    for (const phrase of [
      "https://minikanban-ops.productvision.workers.dev/mcp",
      "https://minikanban-ops.productvision.workers.dev/boards/ops",
      "source of truth",
      "Task List",
      "Need you",
      "I'm on",
      "Done",
      "Waiting",
      "closeSubStatus",
      "description",
    ]) {
      assert.ok(guide.includes(phrase), phrase)
    }
    const pluginReadme = readFileSync(path.join(pluginRoot, "README.md"), "utf8")
    assert.match(pluginReadme, /docs\/grok-bot-task-list\.md/)
    assert.equal(statSync(path.join(pluginRoot, "assets/logo.svg")).isFile(), true)

    const bundled = walk(pluginRoot)
      .filter((file) => !file.endsWith(`${path.sep}LICENSE`))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n")
    assert.doesNotMatch(bundled, /https?:\/\/[^\s)"']*giantmind/i)
    assert.doesNotMatch(bundled, /giantmind\.[a-z0-9]/i)
    assert.doesNotMatch(bundled, /replit\.(app|dev)/i)
    assert.doesNotMatch(bundled, /Bearer\s+(?!\$\{OPS_BOARD_SECRET\})[A-Za-z0-9._~+/-]{8,}/)
    assert.doesNotMatch(bundled, /OPS_BOARD_SECRET\s*[:=]\s*["'][^"']+["']/)
  })
})
