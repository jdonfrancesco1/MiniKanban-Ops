"use client"

import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { KanbanCard } from "@/components/kanban-card"
import { ProjectLegend } from "@/components/project-chip"
import { buildOpsCardPreviewTasks, previewColumnTitle } from "@/lib/preview-ops-cards"

const previewTasks = buildOpsCardPreviewTasks()
const needYouTasks = previewTasks.filter((task) => task.columnId !== "done")
const doneTasks = previewTasks.filter((task) => task.columnId === "done")

export default function OpsCardPreviewPage() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  return (
    <div className="min-h-screen bg-[#1a0b2e] text-white p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-pink-300">Ops card preview</p>
      <h1 className="text-2xl font-semibold mt-1 mb-2">Project colors, briefs, dates, and full asks</h1>
      <p className="text-sm text-white/70 mb-4 max-w-xl">
        Click a card for the full Need you description. This page is a layout preview and does not load Helium.
      </p>
      <ProjectLegend className="mb-6" />
      <DndContext sensors={sensors}>
        <SortableContext items={previewTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-8 max-w-md pb-16">
            <section>
              <h2 className="text-sm font-medium text-white/80 mb-3">Need you</h2>
              <div className="grid gap-3">
                {needYouTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    boardId="preview"
                    columnId={task.columnId || "need-you"}
                    columnTitle={previewColumnTitle(task.columnId || "need-you")}
                  />
                ))}
              </div>
            </section>
            <section>
              <h2 className="text-sm font-medium text-white/80 mb-3">Done</h2>
              <div className="grid gap-3">
                {doneTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    boardId="preview"
                    columnId="done"
                    columnTitle="Done"
                  />
                ))}
              </div>
            </section>
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
