"use client"

import { Badge } from "@/components/ui/badge"
import { OPS_PROJECTS, projectChipClass, projectChipStyle, projectSwatchClass, projectSwatchStyle } from "@/lib/projects"
import { cn } from "@/lib/utils"

export function ProjectChip({
  project,
  className,
}: {
  project: string
  className?: string
}) {
  return (
    <Badge
      variant="secondary"
      data-project={project}
      data-testid="project-chip"
      className={cn("text-[10px] font-semibold uppercase tracking-wide border", projectChipClass(project), className)}
      style={projectChipStyle(project)}
    >
      {project}
    </Badge>
  )
}

export function ProjectPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: string | null
  onChange: (project: string | null) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {OPS_PROJECTS.map((project) => {
        const selected = value === project
        return (
          <button
            key={project}
            type="button"
            disabled={disabled}
            onClick={() => onChange(selected ? null : project)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors",
              selected ? projectChipClass(project) : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white",
            )}
            style={selected ? projectChipStyle(project) : undefined}
          >
            {project}
          </button>
        )
      })}
    </div>
  )
}

export function ProjectLegend({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5", className)}
      data-testid="project-legend"
      aria-label="Project colors"
    >
      {OPS_PROJECTS.map((project) => (
        <span
          key={project}
          className="inline-flex items-center gap-1.5 text-[11px] text-white/75"
          data-testid={`project-legend-${project}`}
        >
          <span
            className={cn("h-2.5 w-2.5 shrink-0 rounded-full", projectSwatchClass(project))}
            data-project-swatch={project}
            style={projectSwatchStyle(project)}
            aria-hidden
          />
          {project}
        </span>
      ))}
    </div>
  )
}
