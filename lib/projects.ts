export const OPS_PROJECTS = [
  "Giant",
  "Paylyte",
  "MiniKanban",
  "Hangar 18",
  "Off Replit",
  "Security",
  "Marketing",
  "James",
] as const

export type OpsProject = (typeof OPS_PROJECTS)[number]

export type OpsProjectStyle = {
  chip: string
  bar: string
  swatch: string
}

export const OPS_PROJECT_STYLES: Record<OpsProject, OpsProjectStyle> = {
  Giant: {
    chip: "bg-blue-500 text-white border-blue-300",
    bar: "bg-blue-400",
    swatch: "bg-blue-400",
  },
  Paylyte: {
    chip: "bg-orange-500 text-white border-orange-300",
    bar: "bg-orange-400",
    swatch: "bg-orange-400",
  },
  MiniKanban: {
    chip: "bg-teal-600 text-white border-violet-300",
    bar: "bg-gradient-to-b from-violet-400 to-teal-400",
    swatch: "bg-gradient-to-b from-violet-400 to-teal-400",
  },
  "Hangar 18": {
    chip: "bg-emerald-500 text-white border-emerald-300",
    bar: "bg-emerald-400",
    swatch: "bg-emerald-400",
  },
  "Off Replit": {
    chip: "bg-slate-500 text-white border-slate-300",
    bar: "bg-slate-400",
    swatch: "bg-slate-400",
  },
  Security: {
    chip: "bg-red-500 text-white border-red-300",
    bar: "bg-red-400",
    swatch: "bg-red-400",
  },
  Marketing: {
    chip: "bg-fuchsia-500 text-white border-fuchsia-300",
    bar: "bg-fuchsia-400",
    swatch: "bg-fuchsia-400",
  },
  James: {
    chip: "bg-amber-400 text-amber-950 border-amber-200",
    bar: "bg-amber-300",
    swatch: "bg-amber-300",
  },
}

const PROJECT_ALIASES: Record<string, OpsProject> = {
  "off replit/cf": "Off Replit",
  "off replit": "Off Replit",
  "hangar18": "Hangar 18",
}

const PREFIX_RE = /^\s*(?:\[([^\]]+)\]|([^:–—\-/]+)\s*(?::|–|—|-|\/))\s*(.+)$/

export function normalizeProjectName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase()
}

export function matchOpsProject(value: string | null | undefined): OpsProject | null {
  if (!value) return null
  const needle = normalizeProjectName(value)
  const aliased = PROJECT_ALIASES[needle.replace(/\s+/g, "")] ?? PROJECT_ALIASES[needle]
  if (aliased) return aliased
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

export function getTaskProject(task: { title: string; labels?: string[] | null; project?: string | null }): {
  project: string
  known: OpsProject | null
  source: "field" | "label" | "prefix"
  displayTitle: string
} | null {
  const fromField = matchOpsProject(task.project) ?? (task.project?.trim() || null)
  if (fromField) {
    const known = matchOpsProject(fromField)
    return {
      project: known ?? fromField,
      known,
      source: "field",
      displayTitle: parseProjectPrefix(task.title)?.rest || task.title,
    }
  }

  const labels = Array.isArray(task.labels) ? task.labels : []
  const labeled = labels.map((label) => matchOpsProject(label) ?? label.trim()).find(Boolean)
  if (labeled) {
    const known = matchOpsProject(labeled)
    return {
      project: known ?? labeled,
      known,
      source: "label",
      displayTitle: parseProjectPrefix(task.title)?.rest || task.title,
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
  if (known) return OPS_PROJECT_STYLES[known].chip
  return "bg-white/15 text-white border-white/25"
}

export function projectBarClass(project: string | null | undefined) {
  const known = matchOpsProject(project ?? "")
  if (known) return OPS_PROJECT_STYLES[known].bar
  return "bg-white/30"
}

export function projectSwatchClass(project: string) {
  const known = matchOpsProject(project)
  if (known) return OPS_PROJECT_STYLES[known].swatch
  return "bg-white/40"
}

/** Class tokens used only in this module — Tailwind must safelist or scan `./lib`. */
export function opsProjectTailwindSafelist(): string[] {
  const tokens = new Set<string>()
  for (const style of Object.values(OPS_PROJECT_STYLES)) {
    for (const value of [style.chip, style.bar, style.swatch]) {
      for (const token of value.split(/\s+/)) {
        if (token) tokens.add(token)
      }
    }
  }
  return [...tokens]
}

export function upsertProjectLabel(labels: string[] | null | undefined, project: string | null | undefined) {
  const next = (labels ?? []).filter((label) => !matchOpsProject(label))
  const known = matchOpsProject(project ?? "")
  if (known) next.unshift(known)
  else if (project?.trim()) next.unshift(project.trim())
  return Array.from(new Set(next))
}
