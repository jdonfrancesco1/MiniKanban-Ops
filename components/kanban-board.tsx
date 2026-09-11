"use client"

import { useMemo, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import type { Column as DbColumn, Task as DbTask, PlacedSticker } from "@/lib/types"
import { KanbanColumn } from "./kanban-column"

interface KanbanBoardProps {
  columns: DbColumn[]
  tasks: DbTask[]
  boardId: string
  onColumnAdd: (title: string) => void
  onColumnUpdate: (columnId: string, newTitle: string) => void
  onColumnDelete: (columnId: string) => void
  onTaskAdd: (taskData: Partial<DbTask>, columnId: string) => void
  onTaskUpdate: (task: DbTask) => void
  onTaskDelete: (taskId: string, columnId: string) => void
  onTaskMove: (taskId: string, newColumnId: string, newPosition: number, oldColumnId: string) => void
  onColumnMove: (columnId: string, newPosition: number) => void
  readOnly?: boolean
  stickers?: PlacedSticker[]
  onStickerAdd?: (sticker: PlacedSticker) => void
  onStickerMove?: (sticker: PlacedSticker) => void
  onStickerRemove?: (stickerId: string) => void
  selectedSticker?: unknown
  boardStickers?: PlacedSticker[]
  onBoardStickerAdd?: (sticker: Omit<PlacedSticker, "id">) => void
  onBoardStickerMove?: (stickerId: string, position: { x: number; y: number }) => void
  onBoardStickerRemove?: (stickerId: string) => void
}

export function KanbanBoard({
  columns: propColumns,
  tasks: propTasks,
  boardId,
  onColumnAdd,
  onColumnUpdate,
  onColumnDelete,
  onTaskAdd,
  onTaskUpdate,
  onTaskDelete,
  onTaskMove,
  onColumnMove,
  readOnly = false,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<DbTask | null>(null)

  const currentColumns = useMemo(
    () => [...(propColumns || [])].sort((a, b) => a.order - b.order),
    [propColumns],
  )
  const currentTasks = propTasks || []
  const columnIds = currentColumns.map((column) => column.id)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current
    if (data?.type === "task") {
      setActiveTask(data.task as DbTask)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)
    if (!over || readOnly) return

    const activeData = active.data.current
    const overData = over.data.current

    if (activeData?.type === "column" && over.id !== active.id) {
      const newIndex = columnIds.indexOf(String(over.id))
      if (newIndex >= 0) onColumnMove(String(active.id), newIndex)
      return
    }

    if (activeData?.type !== "task") return

    const oldColumnId = String(activeData.columnId)
    let newColumnId = oldColumnId
    let newPosition = 0

    if (overData?.type === "task") {
      newColumnId = String(overData.columnId)
      const destTasks = currentTasks.filter((task) => task.columnId === newColumnId && task.id !== active.id)
      const overIndex = destTasks.findIndex((task) => task.id === over.id)
      newPosition = overIndex >= 0 ? overIndex : destTasks.length
    } else if (overData?.type === "column" || columnIds.includes(String(over.id))) {
      newColumnId = String(over.id)
      newPosition = currentTasks.filter((task) => task.columnId === newColumnId && task.id !== active.id).length
    }

    onTaskMove(String(active.id), newColumnId, newPosition, oldColumnId)
  }

  return (
    <div className="relative w-full h-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-4 p-4 h-full overflow-x-auto">
            {currentColumns.map((column) => {
              const columnTasks = currentTasks
                .filter((task) => task.columnId === column.id)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

              return (
                <KanbanColumn
                  key={column.id}
                  dndId={column.id}
                  boardId={boardId}
                  column={column}
                  tasks={columnTasks}
                  onDeleteColumn={() => onColumnDelete(column.id)}
                  onRenameColumn={(columnId, title) => onColumnUpdate(columnId, title)}
                  onAddTask={(columnId, title) => onTaskAdd({ title, description: "", labels: [] }, columnId)}
                  onTaskDelete={(columnId, taskId) => onTaskDelete(taskId, columnId)}
                  onTaskUpdate={onTaskUpdate}
                />
              )
            })}

            {!readOnly && (
              <button
                onClick={() => onColumnAdd("New Column")}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded shadow w-64 h-12 flex items-center justify-center shrink-0"
              >
                + Add Column
              </button>
            )}
          </div>
        </SortableContext>
        <DragOverlay>
          {activeTask ? (
            <div className="w-72 rounded-md border border-white/20 bg-[#2a1b3e] p-3 text-white shadow-xl">
              {activeTask.title}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default KanbanBoard
