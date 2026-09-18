"use client"

import { useMemo, useState } from "react"
import KanbanBoard from "@/components/kanban-board"
import { ProjectFilter } from "@/components/project-chip"
import { completedAtForColumnMove, placeTaskBefore } from "@/lib/kanban-dnd"
import { filterTasksByProject, type ProjectFilterValue } from "@/lib/projects"
import { buildOpsCardPreviewTasks } from "@/lib/preview-ops-cards"
import type { Column, Task } from "@/lib/types"

const previewTasks = buildOpsCardPreviewTasks()

const previewColumns: Column[] = [
  { id: "need-you", title: "Need you", order: 0, tasks: [] },
  { id: "on", title: "I'm on", order: 1, tasks: [] },
  { id: "waiting", title: "Waiting", order: 2, tasks: [] },
  { id: "done", title: "Done", order: 3, tasks: [] },
]

export default function OpsCardPreviewPage() {
  const [projectFilter, setProjectFilter] = useState<ProjectFilterValue>("all")
  const [tasks, setTasks] = useState<Task[]>(previewTasks)
  const visibleTasks = useMemo(() => filterTasksByProject(tasks, projectFilter), [projectFilter, tasks])

  return (
    <div className="h-screen overflow-hidden bg-[#1a0b2e] text-white flex flex-col">
      <div className="shrink-0 px-6 pt-6 pb-3">
        <p className="text-xs uppercase tracking-[0.2em] text-pink-300">Ops card preview</p>
        <h1 className="text-2xl font-semibold mt-1 mb-2">Project colors, briefs, dates, and live drag</h1>
        <p className="text-sm text-white/70 mb-4 max-w-xl">
          Drag any card left/right between columns or up/down to reorder. Click a card for the full Need you
          description. This page is a layout preview and does not load Helium.
        </p>
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">Project</span>
          <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
          {projectFilter !== "all" ? (
            <p className="text-[11px] text-white/50" data-testid="project-filter-status">
              Showing {visibleTasks.length} of {tasks.length} cards
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <KanbanBoard
          boardId="preview"
          columns={previewColumns}
          tasks={visibleTasks}
          onColumnAdd={() => undefined}
          onColumnUpdate={() => undefined}
          onColumnDelete={() => undefined}
          onColumnMove={() => undefined}
          onTaskAdd={(taskData, columnId) => {
            setTasks((current) => [
              ...current,
              {
                id: `preview-${Date.now()}`,
                title: taskData.title || "Untitled",
                description: taskData.description || "",
                brief: taskData.brief || "",
                labels: taskData.labels || [],
                columnId,
                boardId: "preview",
                order: current.filter((task) => task.columnId === columnId).length,
                createdAt: new Date().toISOString(),
              },
            ])
          }}
          onTaskUpdate={(task) => {
            setTasks((current) => current.map((item) => (item.id === task.id ? { ...item, ...task } : item)))
          }}
          onTaskDelete={(taskId) => {
            setTasks((current) => current.filter((task) => task.id !== taskId))
          }}
          onTaskMove={(taskId, destColumnId, beforeTaskId, sourceColumnId) => {
            setTasks((current) =>
              placeTaskBefore(current, {
                taskId,
                destColumnId,
                beforeTaskId,
                completedAt: completedAtForColumnMove({
                  fromTitle: previewColumns.find((column) => column.id === sourceColumnId)?.title,
                  toTitle: previewColumns.find((column) => column.id === destColumnId)?.title,
                }),
              }),
            )
          }}
        />
      </div>
    </div>
  )
}
