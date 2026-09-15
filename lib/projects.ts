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
    chip: "bg-blue-500/25 text-blue-50 border-blue-300/50",
    bar: "border-l-blue-400",
    swatch: "bg-blue-400",
  },
  Paylyte: {
    chip: "bg-orange-500/30 text-orange-50 border-orange-300/50",
    bar: "border-l-orange-400",
    swatch: "bg-orange-400",
  },
  MiniKanban: {
    chip: "bg-teal-500/20 text-violet-100 border-violet-400/45",
    bar: "border-l-teal-400",
    swatch: "bg-gradient-to-b from-violet-400 to-teal-400",
  },
  "Hangar 18": {
    chip: "bg-emerald-500/25 text-emerald-50 border-emerald-300/50",
    bar: "border-l-emerald-400",
    swatch: "bg-emerald-400",
  },
  "Off Replit": {
    chip: "bg-slate-500/35 text-slate-100 border-slate-300/40",
    bar: "border-l-slate-400",
    swatch: "bg-slate-400",
  },
  Security: {
    chip: "bg-red-500/25 text-red-50 border-red-300/50",
    bar: "border-l-red-400",
    swatch: "bg-red-400",
  },
  Marketing: {
    chip: "bg-fuchsia-500/25 text-fuchsia-50 border-fuchsia-300/50",
    bar: "border-l-fuchsia-400",
    swatch: "bg-fuchsia-400",
  },
  James: {
    chip: "bg-amber-500/30 text-amber-50 border-amber-300/55",
    bar: "border-l-amber-400",
    swatch: "bg-amber-400",
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
  return "border-l-white/25"
}

export function projectSwatchClass(project: string) {
  const known = matchOpsProject(project)
  if (known) return OPS_PROJECT_STYLES[known].swatch
  return "bg-white/40"
}

export function upsertProjectLabel(labels: string[] | null | undefined, project: string | null | undefined) {
  const next = (labels ?? []).filter((label) => !matchOpsProject(label))
  const known = matchOpsProject(project ?? "")
  if (known) next.unshift(known)
  else if (project?.trim()) next.unshift(project.trim())
  return Array.from(new Set(next))
}
