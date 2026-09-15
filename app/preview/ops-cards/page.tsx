"use client"

import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { KanbanCard } from "@/components/kanban-card"
import { ProjectLegend } from "@/components/project-chip"
import { buildOpsCardPreviewTasks } from "@/lib/preview-ops-cards"

const previewTasks = buildOpsCardPreviewTasks()

export default function OpsCardPreviewPage() {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  return (
    <div className="min-h-screen bg-[#1a0b2e] text-white p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-pink-300">Ops card preview</p>
      <h1 className="text-2xl font-semibold mt-1 mb-2">Project colors, briefs, and full asks</h1>
      <p className="text-sm text-white/70 mb-4 max-w-xl">
        Click a card for the full Need you description. This page is a layout preview and does not load Helium.
      </p>
      <ProjectLegend className="mb-6" />
      <DndContext sensors={sensors}>
        <SortableContext items={previewTasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <div className="grid gap-3 max-w-md pb-16">
            {previewTasks.map((task) => (
              <KanbanCard key={task.id} task={task} boardId="preview" columnId="need-you" />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
