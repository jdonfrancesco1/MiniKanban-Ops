"use client"

import { useState } from "react"
import { CLOSE_SUB_STATUSES, isCloseSubStatus, type CloseSubStatus } from "@/lib/close-sub-status"
import { descriptionIsMissing } from "@/lib/task-description"
import { isDoneColumnTitle } from "@/lib/task-dates"
import { useDroppable } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { columnDroppableId } from "@/lib/kanban-dnd"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Trash, Plus, Loader2, GripVertical } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Column, Task } from "@/lib/types"
import { cn } from "@/lib/utils"
import { KanbanCard } from "./kanban-card"
import { ProjectPicker } from "./project-chip"

type KanbanColumnProps = {
  dndId: string
  boardId: string
  column: Column
  tasks: Task[]
  isDropTarget?: boolean
  dragKind?: "task" | "column" | null
  readOnly?: boolean
  className?: string
  onDeleteColumn?: (columnId: string, columnTitle: string) => void
  onRenameColumn?: (columnId: string, title: string) => Promise<void> | void
  onAddTask?: (
    columnId: string,
    title: string,
    labels?: string[],
    description?: string,
    closeSubStatus?: string,
  ) => Promise<void> | void
  onTaskDelete?: (columnId: string, taskId: string) => Promise<void> | void
  onTaskUpdate?: (task: Task) => void
  onCloseSubStatus?: (taskId: string, closeSubStatus: CloseSubStatus) => void
}

export function KanbanColumn({
  dndId,
  boardId,
  column,
  tasks,
  isDropTarget = false,
  dragKind = null,
  readOnly = false,
  className,
  onDeleteColumn,
  onRenameColumn,
  onAddTask,
  onTaskDelete,
  onTaskUpdate,
  onCloseSubStatus,
}: KanbanColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [columnTitle, setColumnTitle] = useState(column.title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskDescription, setNewTaskDescription] = useState("")
  const [newCloseSubStatus, setNewCloseSubStatus] = useState("")
  const [newTaskProject, setNewTaskProject] = useState<string | null>(null)
  const [addError, setAddError] = useState("")
  const [isAddingTask, setIsAddingTask] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isColumnDragging } = useSortable({
    id: dndId,
    data: {
      type: "column",
      column,
      columnId: column.id,
    },
    disabled: readOnly || dragKind === "task",
  })

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: columnDroppableId(column.id),
    data: {
      type: "column",
      column,
      columnId: column.id,
    },
    disabled: readOnly || dragKind === "column",
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isColumnDragging ? "none" : transition,
    zIndex: isColumnDragging ? 999 : undefined,
    opacity: isColumnDragging ? 0.8 : 1,
  }

  const taskIds = (tasks || []).map((task) => task.id)

  const handleTitleChange = async () => {
    if (!columnTitle.trim() || columnTitle === column.title) {
      setColumnTitle(column.title)
      setIsEditingTitle(false)
      return
    }
    setIsLoading(true)
    try {
      await onRenameColumn?.(column.id, columnTitle.trim())
      setIsEditingTitle(false)
    } catch (error) {
      console.error("Error updating column title:", error)
      setColumnTitle(column.title)
    } finally {
      setIsLoading(false)
    }
  }

  const resetAddTask = () => {
    setNewTaskTitle("")
    setNewTaskDescription("")
    setNewCloseSubStatus("")
    setNewTaskProject(null)
    setAddError("")
    setIsAddingTask(false)
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return
    if (descriptionIsMissing(newTaskDescription)) {
      setAddError("Description is required. Add the full ask — the empty placeholder is not a description.")
      return
    }
    if (isDoneColumnTitle(column.title) && !isCloseSubStatus(newCloseSubStatus)) {
      setAddError("Pick a close status: Closed, No Longer Needed, or Duplicate.")
      return
    }
    setAddError("")
    setIsLoading(true)
    try {
      await onAddTask?.(
        column.id,
        newTaskTitle.trim(),
        newTaskProject ? [newTaskProject] : [],
        newTaskDescription.trim(),
        isCloseSubStatus(newCloseSubStatus) ? newCloseSubStatus : undefined,
      )
      resetAddTask()
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Failed to add task")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          "w-80 shrink-0 flex flex-col h-full max-h-full min-h-0 snap-center bg-[#2a1b3e]/80 border-white/10 overflow-hidden",
          isColumnDragging && "opacity-80 shadow-xl z-50 scale-[1.02]",
          (isDropTarget || isOver) && "ring-2 ring-pink-400 ring-offset-2 ring-offset-[#1a0b2e]",
          className,
        )}
        data-column-id={column.id}
        data-column-title={column.title}
        {...attributes}
      >
        <CardHeader
          className="p-3 border-b border-white/10 flex flex-row items-center justify-between space-y-0 gap-2 cursor-grab active:cursor-grabbing shrink-0"
          {...listeners}
        >
          <div className="flex items-center gap-2 flex-1">
            <GripVertical className="h-4 w-4 text-white/70" />
            {isEditingTitle ? (
              <Input
                value={columnTitle}
                onChange={(event) => setColumnTitle(event.target.value)}
                onBlur={handleTitleChange}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleTitleChange()
                  if (event.key === "Escape") {
                    setColumnTitle(column.title)
                    setIsEditingTitle(false)
                  }
                }}
                className="h-8 text-base font-medium bg-white/10 border-white/20 text-white"
                autoFocus
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
              />
            ) : (
              <h3
                className="text-base font-medium cursor-pointer flex-1 truncate text-white"
                onClick={(event) => {
                  event.stopPropagation()
                  setIsEditingTitle(true)
                }}
                title={column.title}
              >
                {column.title}
              </h3>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setShowDeleteConfirm(true)}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-3 pb-8 flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto overflow-x-visible">
          <div
            ref={setDroppableRef}
            data-testid="kanban-column-drop"
            data-column-id={column.id}
            data-column-title={column.title}
            className="flex-1 flex flex-col gap-3 min-h-[52px] rounded-md"
          >
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy} id={`column-${column.id}-tasks`}>
              {(tasks || []).map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  boardId={boardId}
                  columnId={column.id}
                  columnTitle={column.title}
                  dragDisabled={readOnly || dragKind === "column"}
                  onDeleted={() => onTaskDelete?.(column.id, task.id)}
                  onUpdated={onTaskUpdate}
                  onCloseSubStatus={
                    onCloseSubStatus ? (status) => onCloseSubStatus(task.id, status) : undefined
                  }
                />
              ))}
            </SortableContext>
            <div className="min-h-[52px] flex-1 rounded-md" />
          </div>

          {isAddingTask ? (
            <div className="space-y-2">
              <ProjectPicker value={newTaskProject} onChange={setNewTaskProject} disabled={isLoading} />
              <Input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Enter task title"
                className="text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleAddTask()
                  if (event.key === "Escape") resetAddTask()
                }}
              />
              <Textarea
                value={newTaskDescription}
                onChange={(event) => {
                  setNewTaskDescription(event.target.value)
                  if (addError) setAddError("")
                }}
                placeholder="Full ask — what should James do?"
                rows={3}
                data-testid="new-task-description"
                className="text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50"
              />
              {isDoneColumnTitle(column.title) ? (
                <label className="block text-xs text-white/70">
                  Close status
                  <select
                    value={newCloseSubStatus}
                    onChange={(event) => setNewCloseSubStatus(event.target.value)}
                    data-testid="new-task-close-sub-status"
                    className="mt-1 w-full rounded-md border border-white/20 bg-white px-2 py-2 text-sm text-[#1f1233]"
                  >
                    <option value="">Pick one</option>
                    {CLOSE_SUB_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {addError ? (
                <p className="text-xs text-amber-200" data-testid="new-task-description-error">
                  {addError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void handleAddTask()} disabled={isLoading} className="bg-white/20 hover:bg-white/30 text-white">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Task"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={resetAddTask}
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
              onClick={() => setIsAddingTask(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Task
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Column</AlertDialogTitle>
            <AlertDialogDescription>
              Delete the &quot;{column.title}&quot; column? Tasks in this column are removed with it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                setShowDeleteConfirm(false)
                onDeleteColumn?.(column.id, column.title)
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Column
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
