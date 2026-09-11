"use client"

import { useState, useRef, useEffect } from "react"
// Use types from db-service
import type { Column as DbColumn, Task as DbTask, PlacedSticker } from "@/lib/db-service"
import type { Sticker as StickerPaletteItem } from "@/lib/sticker-data" // Renamed to avoid conflict
import { KanbanColumn } from "./kanban-column"
import { TaskEditModal } from "./task-edit-modal"
import { StickerLayer } from "./sticker-layer" // Assuming default export or correct named export
import { useUndoContext } from "@/contexts/undo-context"

// Props for KanbanBoard will use DbColumn and DbTask
interface KanbanBoardProps {
  columns: DbColumn[] // Array of columns, each potentially containing its tasks from DB
  tasks: DbTask[] // Flat array of all tasks for the board
  boardId: string
  onColumnAdd: (title: string) => void // title for new column
  onColumnUpdate: (columnId: string, newTitle: string) => void // Changed to pass ID and new title
  onColumnDelete: (columnId: string) => void
  onTaskAdd: (taskData: Partial<DbTask>, columnId: string) => void // Added columnId
  onTaskUpdate: (task: DbTask) => void // Full task object for update
  onTaskDelete: (taskId: string, columnId: string) => void // Added columnId
  onTaskMove: (taskId: string, newColumnId: string, newPosition: number, oldColumnId: string) => void // Added oldColumnId
  onColumnMove: (columnId: string, newPosition: number) => void
  readOnly?: boolean
  stickers?: PlacedSticker[] // Board-level stickers
  onStickerAdd?: (sticker: PlacedSticker) => void // Board-level
  onStickerMove?: (sticker: PlacedSticker) => void // Board-level
  onStickerRemove?: (stickerId: string) => void // Board-level
  selectedSticker?: StickerPaletteItem | null // Sticker from palette to be added
}

export function KanbanBoard({
  columns: propColumns, // Renamed to avoid conflict with internal state if any
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
  stickers = [], // Board-level stickers
  onStickerAdd,
  onStickerMove,
  onStickerRemove,
  selectedSticker,
}: KanbanBoardProps) {
  const [editingTask, setEditingTask] = useState<DbTask | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const { addUndoPoint } = useUndoContext() // Consider if undo points are correctly managed here or in parent

  // Ensure columns and tasks are always arrays, sort columns by order
  const currentColumns = (propColumns || []).sort((a, b) => a.order - b.order)
  const currentTasks = propTasks || []

  const handleTaskEdit = (task: DbTask) => {
    if (readOnly) return
    setEditingTask(task)
  }

  const handleTaskSave = (updatedTask: DbTask) => {
    // addUndoPoint(); // Undo should be handled by the actual data mutation function in parent
    onTaskUpdate(updatedTask)
    setEditingTask(null)
  }

  // This is called by KanbanColumn's "Add Task" button
  // KanbanColumn itself handles the input and calls addTask from db-service
  // This prop might be for a different way of adding tasks or can be removed if KanbanColumn handles it.
  // For now, assuming it's for a scenario where KanbanBoard initiates task creation.
  const handleTaskCreate = (columnId: string) => {
    if (readOnly) return

    const columnTasks = currentTasks.filter((task) => task.columnId === columnId)
    const highestPosition =
      columnTasks.length > 0 ? Math.max(...columnTasks.map((task) => (task as any).position ?? 0)) : -1
    // DbTask doesn't have 'position' directly, it's usually implicit by order in array or a separate field.
    // Assuming 'position' is managed by dnd-kit logic and passed during onTaskMove.
    // For adding, it's usually added to the end.

    const newTaskData: Partial<DbTask> = {
      title: "New Task", // Default title
      description: "",
      labels: [],
      // columnId will be set by onTaskAdd if needed, or is part of taskData
    }
    // addUndoPoint();
    onTaskAdd(newTaskData, columnId)
  }

  const handleColumnCreate = () => {
    if (readOnly) return
    // addUndoPoint();
    onColumnAdd("New Column") // Parent (BoardPage) handles creating column with order
  }

  // These handlers mostly delegate to props, undo points should be managed by parent handlers
  const handleColumnDelete = (columnId: string) => {
    if (readOnly) return
    // addUndoPoint();
    onColumnDelete(columnId)
  }

  const handleColumnUpdate = (columnId: string, newTitle: string) => {
    // Changed signature
    if (readOnly) return
    // addUndoPoint();
    onColumnUpdate(columnId, newTitle)
  }

  // These are passed to KanbanColumn, which then calls them.
  // The actual dnd-kit onDragEnd in BoardPage will call the main onTaskMove/onColumnMove.
  // These props on KanbanBoard might be for non-dnd actions or could be simplified.
  const handleTaskMoveInternal = (taskId: string, newColumnId: string, newPosition: number, oldColumnId: string) => {
    if (readOnly) return
    // addUndoPoint();
    onTaskMove(taskId, newColumnId, newPosition, oldColumnId)
  }

  const handleColumnMoveInternal = (columnId: string, newPosition: number) => {
    if (readOnly) return
    // addUndoPoint();
    onColumnMove(columnId, newPosition)
  }

  const handleTaskDeleteInternal = (taskId: string, columnId: string) => {
    if (readOnly) return
    // addUndoPoint();
    onTaskDelete(taskId, columnId)
  }

  useEffect(() => {
    if (!boardRef.current || readOnly || !selectedSticker) return

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy"
    }

    const handleDrop = (e: DragEvent) => {
      e.preventDefault()
      if (!onStickerAdd) return

      try {
        const data = e.dataTransfer?.getData("application/json")
        if (!data) return

        const stickerPaletteItem = JSON.parse(data) as StickerPaletteItem

        const rect = boardRef.current!.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100

        const newPlacedSticker: PlacedSticker = {
          id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Temporary ID, DB will assign final
          stickerId: stickerPaletteItem.id,
          url: stickerPaletteItem.url,
          position: { x, y },
          color: stickerPaletteItem.color,
        }
        onStickerAdd(newPlacedSticker)
      } catch (error) {
        console.error("Error adding sticker:", error)
      }
    }

    const element = boardRef.current
    element.addEventListener("dragover", handleDragOver)
    element.addEventListener("drop", handleDrop)

    return () => {
      element.removeEventListener("dragover", handleDragOver)
      element.removeEventListener("drop", handleDrop)
    }
  }, [readOnly, selectedSticker, stickers.length, onStickerAdd])

  return (
    <div className="relative w-full h-full" ref={boardRef}>
      <div className="flex gap-4 p-4 h-full overflow-x-auto">
        {currentColumns.map((column) => {
          // Filter tasks for the current column.
          // Ensure task.columnId exists for filtering. Tasks from dbService.extractTasksFromBoard should have it.
          const columnTasks = currentTasks.filter((task) => task.columnId === column.id)
          // Sorting by a 'position' or 'orderInColumn' field if tasks have one,
          // otherwise, they appear in the order they are in currentTasks.
          // Dnd-kit will manage visual order, this sort is for initial render.
          // Let's assume tasks don't have a persistent sub-order field, and dnd-kit handles it.
          // .sort((a, b) => (a as any).position - (b as any).position); // If tasks had a position field

          return (
            <KanbanColumn
              key={column.id}
              dndId={column.id} // For Sortable Column
              boardId={boardId}
              column={column} // Pass the full dbService.Column object
              tasks={columnTasks} // Pass the filtered tasks for this column
              // onDeleteColumn, onTaskAdd etc. are handled by KanbanColumn internally or via BoardPage context/dnd
              // For clarity, KanbanColumn should receive callbacks for actions it initiates.
              // Example: onColumnTitleUpdate={(newTitle) => handleColumnUpdate(column.id, newTitle)}
              // Example: onTaskDelete={(taskId) => handleTaskDeleteInternal(taskId, column.id)}
              // The current KanbanColumn props are extensive; simplifying might be good.
              // For now, passing down the main handlers.
              onDeleteColumn={onColumnDelete ? () => onColumnDelete(column.id) : undefined}
              // onTaskCreate is complex, KanbanColumn has its own "Add Task" UI.
              // Let's assume KanbanColumn handles its own task creation UI and calls DBService.addTask.
              // BoardPage will update via subscription.
              // Sticker handlers for column stickers (if supported by KanbanColumn)
              // onStickerAdd={(sticker) => handleColumnStickerAdd(column.id, sticker)}
            />
          )
        })}

        {!readOnly && (
          <div className="flex-shrink-0">
            <button
              onClick={handleColumnCreate}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded shadow w-64 h-12 flex items-center justify-center"
            >
              + Add Column
            </button>
          </div>
        )}
      </div>

      {/* Board-level Sticker Layer */}
      <StickerLayer
        stickers={stickers} // These are board-level stickers
        onStickerMove={onStickerMove}
        onStickerRemove={onStickerRemove}
        containerClassName="pointer-events-auto" // Ensure this allows interaction
      />

      {editingTask && (
        <TaskEditModal
          task={editingTask} // editingTask is DbTask
          boardId={boardId} // Pass boardId
          columnId={editingTask.columnId || ""} // Pass columnId, ensure task has it
          onSave={handleTaskSave}
          onCancel={() => setEditingTask(null)}
        />
      )}
    </div>
  )
}

export default KanbanBoard
