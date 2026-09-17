export const OPS_PROJECTS = [
  "Giant",
  "Paylyte",
  "MiniKanban",
  "Hangar 18",
  "Off Replit",
  "Security",
  "Marketing",
  "Jimbo",
  "Maven",
  "Orca",
] as const

export type OpsProject = (typeof OPS_PROJECTS)[number]

export type OpsProjectStyle = {
  chip: string
  bar: string
  swatch: string
}

/** Hex / CSS paints so pill + left rail cannot be independently purged. */
export type OpsProjectPaint = {
  chip: string
  rail: string
  ink: string
  border: string
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
  Jimbo: {
    chip: "bg-amber-400 text-amber-950 border-amber-200",
    bar: "bg-amber-300",
    swatch: "bg-amber-300",
  },
  Maven: {
    chip: "bg-indigo-500 text-white border-indigo-300",
    bar: "bg-indigo-400",
    swatch: "bg-indigo-400",
  },
  Orca: {
    chip: "bg-cyan-500 text-white border-cyan-300",
    bar: "bg-cyan-400",
    swatch: "bg-cyan-400",
  },
}

export const OPS_PROJECT_PAINT: Record<OpsProject, OpsProjectPaint> = {
  Giant: { chip: "#3b82f6", rail: "#60a5fa", ink: "#ffffff", border: "#93c5fd" },
  Paylyte: { chip: "#f97316", rail: "#fb923c", ink: "#ffffff", border: "#fdba74" },
  MiniKanban: {
    chip: "#0d9488",
    rail: "linear-gradient(180deg, #a78bfa 0%, #2dd4bf 100%)",
    ink: "#ffffff",
    border: "#c4b5fd",
  },
  "Hangar 18": { chip: "#10b981", rail: "#34d399", ink: "#ffffff", border: "#6ee7b7" },
  "Off Replit": { chip: "#64748b", rail: "#94a3b8", ink: "#ffffff", border: "#cbd5e1" },
  Security: { chip: "#ef4444", rail: "#f87171", ink: "#ffffff", border: "#fca5a5" },
  Marketing: { chip: "#d946ef", rail: "#e879f9", ink: "#ffffff", border: "#f0abfc" },
  Jimbo: { chip: "#fbbf24", rail: "#fcd34d", ink: "#451a03", border: "#fde68a" },
  Maven: { chip: "#6366f1", rail: "#818cf8", ink: "#ffffff", border: "#a5b4fc" },
  Orca: { chip: "#06b6d4", rail: "#22d3ee", ink: "#ffffff", border: "#67e8f9" },
}

const PROJECT_ALIASES: Record<string, OpsProject> = {
  "off replit/cf": "Off Replit",
  "off replit": "Off Replit",
  "hangar18": "Hangar 18",
  james: "Jimbo",
  maven: "Maven",
  orca: "Orca",
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

export function projectPaint(project: string | null | undefined): OpsProjectPaint | null {
  const known = matchOpsProject(project ?? "")
  return known ? OPS_PROJECT_PAINT[known] : null
}

export function projectChipStyle(project: string | null | undefined): { backgroundColor: string; color: string; borderColor: string } | undefined {
  const paint = projectPaint(project)
  if (!paint) return undefined
  return { backgroundColor: paint.chip, color: paint.ink, borderColor: paint.border }
}

export function projectRailStyle(project: string | null | undefined): { backgroundColor?: string; backgroundImage?: string } {
  const paint = projectPaint(project)
  if (!paint) return { backgroundColor: "rgba(255,255,255,0.3)" }
  if (paint.rail.includes("gradient")) return { backgroundImage: paint.rail }
  return { backgroundColor: paint.rail }
}

export function projectSwatchStyle(project: string | null | undefined): { backgroundColor?: string; backgroundImage?: string } {
  return projectRailStyle(project)
}

/** Known project ⇒ pill + rail paints are always a pair. */
export function projectCardChrome(project: string | null | undefined) {
  const known = matchOpsProject(project ?? "")
  if (!known) return null
  return {
    known,
    chipClass: OPS_PROJECT_STYLES[known].chip,
    barClass: OPS_PROJECT_STYLES[known].bar,
    swatchClass: OPS_PROJECT_STYLES[known].swatch,
    paint: OPS_PROJECT_PAINT[known],
    chipStyle: projectChipStyle(known),
    railStyle: projectRailStyle(known),
  }
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

export type ProjectFilterValue = "all" | OpsProject

export type TaskProjectSource = {
  title: string
  labels?: string[] | null
  project?: string | null
}

export function parseProjectFilter(value: string | null | undefined): ProjectFilterValue {
  return matchOpsProject(value) ?? "all"
}

export function taskMatchesProjectFilter(task: TaskProjectSource, filter: string | null | undefined): boolean {
  const selected = parseProjectFilter(filter)
  if (selected === "all") return true
  const found = getTaskProject(task)
  if (!found) return false
  return matchOpsProject(found.project) === selected || normalizeProjectName(found.project) === normalizeProjectName(selected)
}

export function filterTasksByProject<T extends TaskProjectSource>(tasks: T[], filter: string | null | undefined): T[] {
  return tasks.filter((task) => taskMatchesProjectFilter(task, filter))
}
