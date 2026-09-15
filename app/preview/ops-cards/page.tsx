"use client"

import { DndContext } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { KanbanCard } from "@/components/kanban-card"
import { ProjectLegend } from "@/components/project-chip"
import { GIANT_SMOKE_CARDS } from "@/lib/card-copy"
import type { Task } from "@/lib/types"

function titleCaseHint(hint: string) {
  return hint
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ")
}

const previewTasks: Task[] = [
  ...GIANT_SMOKE_CARDS.map((card, index) => ({
    id: card.id,
    title: `[Giant] ${titleCaseHint(card.titleHints[0])}`,
    brief: card.brief,
    description: card.description,
    labels: ["Giant"],
    columnId: "need-you",
    boardId: "preview",
    order: index,
  })),
  {
    id: "paylyte",
    title: "[Paylyte] Wire x402 checkout",
    brief: "Confirm the live offering still charges over x402.",
    description: "Open the Paylyte live offering, complete a test buy over x402, and note PASS or the exact fail.",
    labels: ["Paylyte"],
    columnId: "need-you",
    boardId: "preview",
    order: 20,
  },
  {
    id: "james",
    title: "[James] Review Friday asks",
    brief: "Read each Need you card and mark PASS or fail.",
    description: "Open every Need you card. For each, do the ask in the description and reply PASS or a fail note.",
    labels: ["James"],
    columnId: "need-you",
    boardId: "preview",
    order: 21,
  },
]

export default function OpsCardPreviewPage() {
  return (
    <div className="min-h-screen bg-[#1a0b2e] text-white p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-pink-300">Ops card preview</p>
      <h1 className="text-2xl font-semibold mt-1 mb-2">Project colors, briefs, and full asks</h1>
      <p className="text-sm text-white/70 mb-4 max-w-xl">
        Click a card for the full Need you description. This page is a layout preview and does not load Helium.
      </p>
      <ProjectLegend className="mb-6" />
      <DndContext>
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
