"use client"

import { useState, useRef, useEffect } from "react"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash, Plus, Loader2, GripVertical } from "lucide-react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import {
  type Column, // This is db-service.Column
  type Task, // This is db-service.Task
  addTask,
  updateColumnTitle,
  updateTaskStickerPosition,
  removeTaskSticker,
  getBoard, // Used for a check, might be removable if column existence is guaranteed
  updateTaskOrder,
} from "@/lib/db-service"
import { cn } from "@/lib/utils"
import { KanbanCard } from "./kanban-card" // Assuming KanbanCard expects db-service.Task
import { StickerLayer } from "./sticker-layer"
import type { StickerItem } from "./sticker-panel"
import { useMobile } from "@/hooks/use-mobile"

type KanbanColumnProps = {
  dndId: string // This is column.id
  boardId: string
  column: Column // db-service.Column from props
  tasks: Task[]  // Filtered and ordered tasks for this column, from props
  isDragging?: boolean // This seems to be for task dragging, not column dragging
  isDropTarget?: boolean
  className?: string
  onDeleteColumn?: (columnId: string, columnTitle: string) => void
  onStickerAdd?: (columnId: string, sticker: StickerItem) => void // Column sticker
  onStickerMove?: (columnId: string, stickerId: string, position: \{ x: number; y: number \}
) => void // Column sticker
  onStickerRemove?: (columnId: string, stickerId: string) => void // Column sticker
  onTaskReorder?: (columnId: string, taskIds: string[]) => void // Callback for when tasks are reordered within this column
\}

export function KanbanColumn(\{
  dndId,
  boardId,
  column,     // db-service.Column object
  tasks,      // Array of db-service.Task objects for this column
  isDragging = false, // This prop name is confusing; useSortable provides isDragging for the column itself.
  isDropTarget = false,
  className,
  onDeleteColumn,
  onStickerAdd,
  onStickerMove,
  onStickerRemove,
  onTaskReorder, // This prop seems unused, dnd-kit handles reordering via onDragEnd in parent
\}: KanbanColumnProps) \
{
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [columnTitle, setColumnTitle] = useState(column.title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [isAutoScrolling, setIsAutoScrolling] = useState(false)
  const columnRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const \{ toast \} = useToast()
  const isMobile = useMobile()

  const \{
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isColumnDragging, // This is the actual column dragging state
  \
}
= useSortable(\
{
  id: dndId, // column.id
    data
  : \
  type: "column",
      column, // The full db-service.Column object
    \
  ,
  \
}
)

const style = \
{
  transform: CSS.Transform.toString(transform), transition
  : isColumnDragging ? undefined : transition,
    zIndex: isColumnDragging ? 999 : undefined,
    opacity: isColumnDragging ? 0.8 : 1,
  \
}

// Use the `tasks` prop to derive taskIds for SortableContext
const taskIds = (tasks || []).map((task) => task.id)

// Auto-scroll: `isDragging` prop here refers to task dragging, not column dragging.
// This effect should probably depend on a context value or a different prop if it's about a task being dragged over this column.
// For now, assuming `isDragging` prop is correctly indicating if a task is being dragged globally.
useEffect(() => \{
    if (!contentRef.current) return

    const handleAutoScroll = (e: MouseEvent | TouchEvent) => \{
      if (!contentRef.current || !isDragging) return // isDragging prop

      const container = contentRef.current
      const containerRect = container.getBoundingClientRect()
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
      const topScrollZone = containerRect.top + containerRect.height * 0.2
      const bottomScrollZone = containerRect.bottom - containerRect.height * 0.2
      let scrollSpeed = 0

      if (clientY < topScrollZone) \{
        scrollSpeed = -10 * (1 - (clientY - containerRect.top) / (containerRect.height * 0.2))
        setIsAutoScrolling(true)
      \} else if (clientY > bottomScrollZone) \{
        scrollSpeed = 10 * (1 - (containerRect.bottom - clientY) / (containerRect.height * 0.2))
        setIsAutoScrolling(true)
      \} else \{
        setIsAutoScrolling(false)
return
\}
      container.scrollTop += scrollSpeed
    \}

    document.addEventListener("mousemove", handleAutoScroll)
    document.addEventListener("touchmove", handleAutoScroll)

return () => \
{
  document.removeEventListener("mousemove", handleAutoScroll)
  document.removeEventListener("touchmove", handleAutoScroll)
  setIsAutoScrolling(false)
  \
}
\}, [isDragging]) // Depends on the `isDragging` prop

// This handleTaskReorder seems to be for optimistic updates or specific logic not covered by dnd-kit's onDragEnd.
// The `onTaskReorder` prop is also currently unused by KanbanBoard.
// For now, this function is kept, but its invocation path is unclear.
// Dnd-kit's onDragEnd in KanbanBoard should be the primary source for reordering persistence.
const handleTaskReorderInternal = async (updatedTaskIds: string[]) => \
{
  try
  \
  {
    const result = await updateTaskOrder(boardId, column.id, updatedTaskIds)
    if (!result.success)
    \
    throw new Error(result.error || "Failed to update task order")
    \
    if (onTaskReorder)
    \
    // Prop for parent notification
    onTaskReorder(column.id, updatedTaskIds)
    \
    toast(\{
        title: "Tasks reordered",
        description: "The task order has been updated successfully.",
      \})
    \
  }
  catch (error) \
  console.error("Error reordering tasks:", error)
  toast(\{
        title: "Error",
        description: "Failed to reorder tasks. Please try again.",
        variant: "destructive",
      \})
  \
  \
}

const handleTitleChange = async () => \
{
  if (!columnTitle.trim() || columnTitle === column.title)
  \
  setColumnTitle(column.title)
  setIsEditingTitle(false)
  return
  \
  setIsLoading(true)
  try
  \
  await updateColumnTitle(boardId, column.id, columnTitle)
  setIsEditingTitle(false)
  toast(\{
        title: "Column updated",
        description: "Column title has been updated successfully",
      \})
  \
  catch (error) \
  console.error("Error updating column title:", error)
  toast(\{
        title: "Error",
        description: "Failed to update column title. Please try again.",
        variant: "destructive",
      \})
  setColumnTitle(column.title) // Revert on error
  \
  finally \
  setIsLoading(false)
  \
  \
}

const handleDeleteColumn = async () => \
{
  if (!onDeleteColumn) return
  setShowDeleteConfirm(false)
  onDeleteColumn(column.id, column.title) // Delegate to parent
  \
}

const handleAddTask = async () => \
{
  if (!newTaskTitle.trim()) return
  setIsLoading(true)
  try
  \
  {
    // This check might be redundant if board/column structure is validated by parent
    const currentBoard = await getBoard(boardId)
    const columnExists = currentBoard.columns.some((col) => col.id === column.id)
    if (!columnExists)
    \
    toast(\{
          title: "Error",
          description: "The column you're adding to doesn't exist. Please refresh the page.",
          variant: "destructive",
        \})
    setIsLoading(false)
    return
    \

    // addTask in db-service now returns the new task object or null
    const newTask = await addTask(boardId, column.id, \{
        title: newTaskTitle,
        description: "", // Default empty description
        labels: [],      // Default empty labels
        // stickers will be undefined by default
      \})

    if (!newTask)
    \
    // Check if task creation failed
    throw new Error("Failed to add task. The column may not exist or another error occurred.")
    \

    setNewTaskTitle("")
    setIsAddingTask(false)
    toast(\{
        title: "Task added",
        description: `$\{newTask.title\} has been added.`,
      \})
    // Parent (KanbanBoard) should handle updating its state based on db subscription or explicit callback
    \
  }
  catch (error) \
  console.error("[KanbanColumn] Error adding task:", error)
  toast(\{
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add task. Please try again.",
        variant: "destructive",
      \})
  \
  finally \
  setIsLoading(false)
  \
  \
}

const handleTaskStickerMove = (taskId: string, stickerId: string, position: \{ x: number;
y: number
\}) => \
{
  updateTaskStickerPosition(boardId, column.id, taskId, stickerId, position)
  \
}

const handleTaskStickerRemove = (taskId: string, stickerId: string) => \
{
  removeTaskSticker(boardId, column.id, taskId, stickerId)
  \
}

const handleColumnStickerMove = (stickerId: string, position: \{ x: number;
y: number
\}) => \
{
  if (onStickerMove)
  \
  // Prop for column stickers
  onStickerMove(column.id, stickerId, position)
  \
  \
}

const handleColumnStickerRemove = (stickerId: string) => \
{
  if (onStickerRemove)
  \
  // Prop for column stickers
  onStickerRemove(column.id, stickerId)
  \
  \
}

return (
    <>
      <Card
        ref=\{(node) => \{
          setNodeRef(node)
          if (columnRef) \{ // This check is a bit odd, columnRef is always defined
            columnRef.current = node
          \}
        \}\}
        style=\{style\}
        className=\{cn(
          "w-80 shrink-0 flex flex-col h-fit snap-center transition-all duration-200",
          "glassmorphic", // Ensure this class is defined or remove
          isColumnDragging && "opacity-80 shadow-xl z-50 scale-[1.02]",
          isDropTarget && "ring-2 ring-primary ring-offset-2 bg-primary/5",
          className,
        )\}
        data-column-id=\{column.id\}
        \{...attributes\} // For column dragging
        // listeners for column dragging should be on header or a drag handle
      >
        <CardHeader
          className="p-3 border-b border-white/10 flex flex-row items-center justify-between space-y-0 gap-2 cursor-grab active:cursor-grabbing"
          \{...listeners\} // Moved listeners here for better drag UX
        >
          <div className="flex items-center gap-2 flex-1">
            <div
              className=\{cn(
                "p-1 rounded text-white/70",
                "hover:bg-white/10 hover:text-white transition-colors",
                isColumnDragging && "bg-white/10 text-white",
              )\}
              // \{...listeners\} // If only handle is draggable
            >
              <GripVertical className="h-4 w-4" />
            </div>

            \{isEditingTitle ? (
              <Input
                value=\{columnTitle\}
                onChange=\{(e) => setColumnTitle(e.target.value)\}
                onBlur=\{handleTitleChange\}
                onKeyDown=\{(e) => \{
                  if (e.key === "Enter") handleTitleChange()
                  if (e.key === "Escape") \{
                    setColumnTitle(column.title)
                    setIsEditingTitle(false)
                  \}
                \}\}
                className="h-8 text-base font-medium bg-white/10 border-white/20 text-white"
                autoFocus
                onClick=\{(e) => e.stopPropagation()\}
                onMouseDown=\{(e) => e.stopPropagation()\}
              />
            ) : (
              <h3
                className="text-base font-medium cursor-pointer flex-1 truncate text-white"
                onClick=\{(e) => \{
                  e.stopPropagation()
                  setIsEditingTitle(true)
                \}\}
                title=\{column.title\}
              >
                \{column.title\}
              </h3>
            )\}
          </div>

          <div
            className="flex items-center gap-1"
            onClick=\{(e) => e.stopPropagation()\}
            onMouseDown=\{(e) => e.stopPropagation()\}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
              onClick=\{() => setShowDeleteConfirm(true)\}
              disabled=\{isLoading\} // Should be isDeletingColumn or similar specific state
            >
              <Trash className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent
          ref=\{contentRef\}
          className=\{cn(
            "p-3 flex-1 flex flex-col gap-3 min-h-[50px] max-h-[calc(100vh-250px)] overflow-y-auto",
            isMobile && "relative", // Consider scrollbar styling for consistency
            isAutoScrolling && "scroll-smooth",
          )\}
        >
          \{isMobile && ( /* Consider if these indicators are still needed/styled well */
            <>
              <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 h-12 w-4 flex items-center justify-center opacity-50 pointer-events-none">
                <div className="w-1 h-8 bg-white/30 rounded-full"></div>
              </div>
              <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 h-12 w-4 flex items-center justify-center opacity-50 pointer-events-none">
                <div className="w-1 h-8 bg-white/30 rounded-full"></div>
              </div>
            </>
          )\}

          \{isDropTarget && (
            <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-white/50 rounded-md bg-white/5 z-10"></div>
          )\}
          
          \{/* Use the `tasks` prop (filtered list) for SortableContext and rendering KanbanCard */\}
          <SortableContext items=\{taskIds\} strategy=\{verticalListSortingStrategy\} id=\{`column-$\{column.id\}-tasks`\}>
            \{(tasks || []).map((task: Task) => ( // Iterate over `tasks` prop
              <KanbanCard // Assuming KanbanCard is the new name for KanbanTask or similar
                key=\{task.id\}
                task=\{task\} // Pass db-service.Task
                boardId=\{boardId\}
                columnId=\{column.id\} // Pass current column's ID
                onStickerMove=\{(stickerId, position) => handleTaskStickerMove(task.id, stickerId, position)\}
                onStickerRemove=\{(stickerId) => handleTaskStickerRemove(task.id, stickerId)\}
                className=\{className\} // Pass column theme to cards
              />
            ))\}
          </SortableContext>

          \{isAddingTask ? (
            <div className="space-y-2">
              <Input
                value=\{newTaskTitle\}
                onChange=\{(e) => setNewTaskTitle(e.target.value)\}
                placeholder="Enter task title"
                className="text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50"
                autoFocus
                onKeyDown=\{(e) => \{
                  if (e.key === "Enter") handleAddTask()
                  if (e.key === "Escape") \{
                    setNewTaskTitle("")
                    setIsAddingTask(false)
                  \}
                \}\}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick=\{handleAddTask\}
                  disabled=\{isLoading\}
                  className="bg-white/20 hover:bg-white/30 text-white"
                >
                  \{isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    "Add Task"
                  )\}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick=\{() => \{
                    setNewTaskTitle("")
                    setIsAddingTask(false)
                  \}\}
                  disabled=\{isLoading\}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              className="justify-start text-white/70 hover:text-white hover:bg-white/10"
              onClick=\{() => setIsAddingTask(true)\}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          )\}
        </CardContent>

\
{
  /* Column-level stickers, using column.stickers from db-service.Column type */ \
}
\
{
  column.stickers && column.stickers.length > 0 && (
          <StickerLayer
            stickers=\{column.stickers\}
            onStickerMove=\{handleColumnStickerMove\}
            onStickerRemove=\{handleColumnStickerRemove\}
            containerClassName="p-3" // Ensure this class doesn't conflict with CardContent padding
          />
        )\}
      </Card>

      <AlertDialog
  open=\
  showDeleteConfirm
  \
  onOpenChange=\
  setShowDeleteConfirm
  \
  >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the "\{column.title\}" column? All tasks in this column will be deleted. You
              can undo this action
  for a short time after
  deletion.
  </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled=\
  isLoading
  \
  >Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick=\
  (e) => \
  e.preventDefault()
  handleDeleteColumn()
  \
  \
  disabled=\
  isLoading
  \
  className = "bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              \
  isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Deleting...
    </>
  ) : (
    "Delete Column"
  )
  \
  </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
\
}
