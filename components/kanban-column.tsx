"use client"

import { useState } from "react"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

type KanbanColumnProps = {
  dndId: string
  boardId: string
  column: Column
  tasks: Task[]
  isDropTarget?: boolean
  className?: string
  onDeleteColumn?: (columnId: string, columnTitle: string) => void
  onRenameColumn?: (columnId: string, title: string) => Promise<void> | void
  onAddTask?: (columnId: string, title: string) => Promise<void> | void
  onTaskDelete?: (columnId: string, taskId: string) => Promise<void> | void
  onTaskUpdate?: (task: Task) => void
}

export function KanbanColumn({
  dndId,
  boardId,
  column,
  tasks,
  isDropTarget = false,
  className,
  onDeleteColumn,
  onRenameColumn,
  onAddTask,
  onTaskDelete,
  onTaskUpdate,
}: KanbanColumnProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [columnTitle, setColumnTitle] = useState(column.title)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [isAddingTask, setIsAddingTask] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isColumnDragging } = useSortable({
    id: dndId,
    data: {
      type: "column",
      column,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isColumnDragging ? undefined : transition,
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

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return
    setIsLoading(true)
    try {
      await onAddTask?.(column.id, newTaskTitle.trim())
      setNewTaskTitle("")
      setIsAddingTask(false)
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
          "w-80 shrink-0 flex flex-col h-fit snap-center transition-all duration-200 bg-[#2a1b3e]/80 border-white/10",
          isColumnDragging && "opacity-80 shadow-xl z-50 scale-[1.02]",
          isDropTarget && "ring-2 ring-pink-400 ring-offset-2 ring-offset-[#1a0b2e]",
          className,
        )}
        data-column-id={column.id}
        {...attributes}
      >
        <CardHeader
          className="p-3 border-b border-white/10 flex flex-row items-center justify-between space-y-0 gap-2 cursor-grab active:cursor-grabbing"
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

        <CardContent className="p-3 flex-1 flex flex-col gap-3 min-h-[80px] max-h-[calc(100vh-250px)] overflow-y-auto">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy} id={`column-${column.id}-tasks`}>
            {(tasks || []).map((task) => (
              <KanbanCard
                key={task.id}
                task={task}
                boardId={boardId}
                columnId={column.id}
                onDeleted={() => onTaskDelete?.(column.id, task.id)}
                onUpdated={onTaskUpdate}
              />
            ))}
          </SortableContext>

          {isAddingTask ? (
            <div className="space-y-2">
              <Input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="Enter task title"
                className="text-sm bg-white/10 border-white/20 text-white placeholder:text-white/50"
                autoFocus
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleAddTask()
                  if (event.key === "Escape") {
                    setNewTaskTitle("")
                    setIsAddingTask(false)
                  }
                }}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => void handleAddTask()} disabled={isLoading} className="bg-white/20 hover:bg-white/30 text-white">
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Add Task"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNewTaskTitle("")
                    setIsAddingTask(false)
                  }}
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
