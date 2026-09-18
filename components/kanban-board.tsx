"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import type { Column as DbColumn, Task as DbTask, PlacedSticker } from "@/lib/types"
import {
  applyTaskDragOver,
  pickPreferredCollision,
  resolvePersistedDrop,
  sortByOrder,
} from "@/lib/kanban-dnd"
import { KanbanColumn } from "./kanban-column"
import { KanbanDragOverlay } from "./kanban-card"

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
  onTaskMove: (taskId: string, newColumnId: string, beforeTaskId: string | null, oldColumnId: string) => void
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

type DragKind = "task" | "column"

type OverTarget = {
  id: string
  type?: string
  columnId?: string
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
  const [dragKind, setDragKind] = useState<DragKind | null>(null)
  const [draftTasks, setDraftTasks] = useState<DbTask[] | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)

  const dragKindRef = useRef<DragKind | null>(null)
  const dragStartTasksRef = useRef<DbTask[]>(propTasks || [])
  const lastOverRef = useRef<OverTarget | null>(null)

  const currentColumns = useMemo(
    () => [...(propColumns || [])].sort((a, b) => a.order - b.order),
    [propColumns],
  )
  const columnIds = useMemo(() => currentColumns.map((column) => column.id), [currentColumns])
  const displayTasks = draftTasks ?? propTasks ?? []

  useEffect(() => {
    if (!dragKindRef.current) {
      setDraftTasks(null)
    }
  }, [propTasks])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (dragKind === "column") {
        return closestCorners({
          ...args,
          droppableContainers: args.droppableContainers.filter((container) =>
            columnIds.includes(String(container.id)),
          ),
        })
      }
      const pointerHits = pointerWithin(args)
      const collisions = pointerHits.length > 0 ? pointerHits : closestCorners(args)
      return pickPreferredCollision(collisions, columnIds)
    },
    [columnIds, dragKind],
  )

  const readOver = (event: { over: DragOverEvent["over"] }): OverTarget | null => {
    if (!event.over) return lastOverRef.current
    const data = event.over.data.current
    const target = {
      id: String(event.over.id),
      type: typeof data?.type === "string" ? data.type : undefined,
      columnId: data?.columnId ? String(data.columnId) : undefined,
    }
    lastOverRef.current = target
    const nextColumnId = target.columnId || (columnIds.includes(target.id) ? target.id : null)
    setOverColumnId(nextColumnId)
    return target
  }

  const handleDragStart = (event: DragStartEvent) => {
    if (readOnly) return
    const data = event.active.data.current
    const kind = data?.type === "column" || data?.type === "task" ? (data.type as DragKind) : null
    dragKindRef.current = kind
    setDragKind(kind)
    dragStartTasksRef.current = displayTasks
    lastOverRef.current = null
    setOverColumnId(null)
    if (kind === "task") {
      setActiveTask((data?.task as DbTask | undefined) ?? displayTasks.find((task) => task.id === event.active.id) ?? null)
      setDraftTasks(displayTasks)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (readOnly || dragKindRef.current !== "task") return
    const over = readOver(event)
    if (!over) return
    setDraftTasks((current) => {
      const next = applyTaskDragOver(dragStartTasksRef.current, {
        activeId: String(event.active.id),
        overId: over.id,
        overType: over.type,
        overColumnId: over.columnId,
        columnIds,
      })
      const currentTask = (current ?? dragStartTasksRef.current).find((task) => task.id === event.active.id)
      const nextTask = next.find((task) => task.id === event.active.id)
      if (
        currentTask &&
        nextTask &&
        currentTask.columnId === nextTask.columnId &&
        (currentTask.order ?? 0) === (nextTask.order ?? 0)
      ) {
        return current ?? next
      }
      return next
    })
  }

  const finishTaskDrag = (activeId: string, over: OverTarget | null) => {
    const origin = dragStartTasksRef.current
    const next = over
      ? applyTaskDragOver(origin, {
          activeId,
          overId: over.id,
          overType: over.type,
          overColumnId: over.columnId,
          columnIds,
        })
      : draftTasks ?? origin
    setDraftTasks(next)
    const drop = resolvePersistedDrop(origin, next, activeId)
    if (drop) {
      onTaskMove(drop.taskId, drop.destColumnId, drop.beforeTaskId, drop.sourceColumnId)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const kind = dragKindRef.current
    const overTarget = readOver(event)
    dragKindRef.current = null
    setDragKind(null)
    setActiveTask(null)
    lastOverRef.current = null
    setOverColumnId(null)

    if (readOnly) {
      setDraftTasks(null)
      return
    }

    if (kind === "column" && over && over.id !== active.id) {
      setDraftTasks(null)
      const newIndex = columnIds.indexOf(String(over.id))
      if (newIndex >= 0) onColumnMove(String(active.id), newIndex)
      return
    }

    if (kind === "task") {
      finishTaskDrag(String(active.id), overTarget)
      return
    }

    setDraftTasks(null)
  }

  const handleDragCancel = () => {
    dragKindRef.current = null
    setDragKind(null)
    setActiveTask(null)
    setDraftTasks(null)
    lastOverRef.current = null
    setOverColumnId(null)
  }

  return (
    <div className="relative w-full h-full min-h-0" data-testid="kanban-board">
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          <div className="flex items-stretch gap-4 p-4 pb-8 h-full min-h-0 overflow-x-auto overflow-y-hidden">
            {currentColumns.map((column) => {
              const columnTasks = sortByOrder(
                displayTasks.filter((task) => String(task.columnId) === String(column.id)),
              )

              return (
                <KanbanColumn
                  key={column.id}
                  dndId={column.id}
                  boardId={boardId}
                  column={column}
                  tasks={columnTasks}
                  dragKind={dragKind}
                  isDropTarget={dragKind === "task" && overColumnId === column.id}
                  readOnly={readOnly}
                  onDeleteColumn={() => onColumnDelete(column.id)}
                  onRenameColumn={(columnId, title) => onColumnUpdate(columnId, title)}
                  onAddTask={(columnId, title, labels) =>
                    onTaskAdd({ title, description: "", brief: "", labels: labels ?? [] }, columnId)
                  }
                  onTaskDelete={(columnId, taskId) => onTaskDelete(taskId, columnId)}
                  onTaskUpdate={onTaskUpdate}
                />
              )
            })}

            {!readOnly && (
              <button
                onClick={() => onColumnAdd("New Column")}
                className="bg-white/10 hover:bg-white/20 text-white font-semibold py-2 px-4 rounded shadow w-64 h-12 flex items-center justify-center shrink-0 self-start"
              >
                + Add Column
              </button>
            )}
          </div>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
          {activeTask ? <KanbanDragOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default KanbanBoard
