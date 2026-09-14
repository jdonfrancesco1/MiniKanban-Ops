export const OPS_PROJECTS = [
  "Paylyte",
  "Giant",
  "MiniKanban",
  "Hangar 18",
  "Off Replit/CF",
  "Security",
  "Marketing",
] as const

export type OpsProject = (typeof OPS_PROJECTS)[number]

export const OPS_PROJECT_STYLES: Record<OpsProject, string> = {
  Paylyte: "bg-cyan-500/25 text-cyan-100 border-cyan-300/40",
  Giant: "bg-violet-500/25 text-violet-100 border-violet-300/40",
  MiniKanban: "bg-pink-500/25 text-pink-100 border-pink-300/40",
  "Hangar 18": "bg-amber-500/25 text-amber-100 border-amber-300/40",
  "Off Replit/CF": "bg-sky-500/25 text-sky-100 border-sky-300/40",
  Security: "bg-red-500/25 text-red-100 border-red-300/40",
  Marketing: "bg-emerald-500/25 text-emerald-100 border-emerald-300/40",
}

const PREFIX_RE = /^\s*(?:\[([^\]]+)\]|([^:–—\-/]+)\s*(?::|–|—|-|\/))\s*(.+)$/

export function normalizeProjectName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

export function matchOpsProject(value: string | null | undefined): OpsProject | null {
  if (!value) return null
  const needle = normalizeProjectName(value)
  return OPS_PROJECTS.find((project) => normalizeProjectName(project) === needle) ?? null
}

export function parseProjectPrefix(title: string): { project: string; rest: string } | null {
  const match = PREFIX_RE.exec(title)
  if (!match) return null
  const project = (match[1] || match[2] || "").trim()
  const rest = (match[3] || "").trim()
  if (!project || !rest) return null
  return { project, rest }
}

export function getTaskProject(task: { title: string; labels?: string[] | null }): {
  project: string
  known: OpsProject | null
  source: "label" | "prefix"
  displayTitle: string
} | null {
  const labels = Array.isArray(task.labels) ? task.labels : []
  const labeled = labels.map((label) => matchOpsProject(label) ?? label.trim()).find(Boolean)
  if (labeled) {
    const known = matchOpsProject(labeled)
    return {
      project: known ?? labeled,
      known,
      source: "label",
      displayTitle: task.title,
    }
  }

  const prefixed = parseProjectPrefix(task.title)
  if (prefixed) {
    const known = matchOpsProject(prefixed.project)
    return {
      project: known ?? prefixed.project,
      known,
      source: "prefix",
      displayTitle: prefixed.rest,
    }
  }

  return null
}

export function projectChipClass(project: string) {
  const known = matchOpsProject(project)
  if (known) return OPS_PROJECT_STYLES[known]
  return "bg-white/15 text-white border-white/25"
}

export function upsertProjectLabel(labels: string[] | null | undefined, project: string | null | undefined) {
  const next = (labels ?? []).filter((label) => !matchOpsProject(label))
  const known = matchOpsProject(project ?? "")
  if (known) next.unshift(known)
  else if (project?.trim()) next.unshift(project.trim())
  return Array.from(new Set(next))
}
