"use client"

import { useState, useRef } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash, Loader2, GripVertical } from "lucide-react"
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
import { useToast } from "@/hooks/use-toast"
import { useUndo } from "@/hooks/use-undo"
import { type Task, deleteTask } from "@/lib/db-service"
import { cn } from "@/lib/utils"
import { FormattedDescription } from "./formatted-description"
import { TaskEditModal } from "./task-edit-modal"
import { StickerLayer } from "./sticker-layer"
import type { StickerItem } from "./sticker-panel"
import { useMobile } from "@/hooks/use-mobile"

type KanbanTaskProps = {
  task: Task
  boardId: string
  columnId: string
  onStickerAdd?: (sticker: StickerItem) => void
  onStickerMove?: (stickerId: string, position: { x: number; y: number }) => void
  onStickerRemove?: (stickerId: string) => void
  className?: string
}

export function KanbanTask({
  task,
  boardId,
  columnId,
  onStickerAdd,
  onStickerMove,
  onStickerRemove,
  className,
}: KanbanTaskProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const taskRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { addUndoAction, clearUndoAction } = useUndo()
  const isMobile = useMobile()

  // Set up sortable
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
      columnId,
    },
  })

  // Style for dragging
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.6 : 1,
  }

  // Check if the description is HTML content
  const hasDescription = !!task.description && task.description.trim() !== ""

  // Handle delete task
  const handleDeleteTask = async () => {
    if (!boardId || !columnId) {
      toast({
        title: "Error",
        description: "Cannot delete task: missing board or column information",
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    try {
      // Store task data for potential undo
      const taskData = {
        task: { ...task },
        columnId,
        boardId,
      }

      // Close confirmation dialog immediately
      setShowDeleteConfirm(false)

      // Add to undo stack before actual deletion
      addUndoAction({
        id: task.id,
        type: "task",
        name: task.title,
        data: taskData,
      })

      // Delete the task from the database
      const result = await deleteTask(boardId, columnId, task.id)

      if (!result.success) {
        throw new Error(result.error || "Failed to delete task")
      }

      toast({
        title: "Task deleted",
        description: `Task "${task.title}" has been deleted.`,
      })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      })

      // Clear the undo action if deletion fails
      clearUndoAction()
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle sticker movement
  const handleStickerMove = (stickerId: string, position: { x: number; y: number }) => {
    if (onStickerMove) {
      onStickerMove(stickerId, position)
    }
  }

  // Handle sticker removal
  const handleStickerRemove = (stickerId: string) => {
    if (onStickerRemove) {
      onStickerRemove(stickerId)
    }
  }

  return (
    <>
      <div className="relative group">
        {/* Card component */}
        <Card
          ref={(node) => {
            // Set both refs
            setNodeRef(node)
            if (taskRef) {
              taskRef.current = node
            }
          }}
          style={style}
          className={cn(
            "cursor-grab active:cursor-grabbing relative",
            isDragging && "opacity-60 shadow-xl z-50",
            isMobile && "touch-manipulation",
            className,
          )}
          data-task-id={task.id}
          data-column-id={columnId}
          {...attributes}
          {...listeners}
        >
          <CardContent className="p-3 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-2 w-full">
                <div className="p-1 rounded text-muted-foreground cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-medium leading-tight flex-1">{task.title}</h4>
              </div>
            </div>

            {hasDescription && (
              <div onClick={() => setShowEditModal(true)}>
                <FormattedDescription
                  description={task.description}
                  collapsible={false}
                  className="p-0 border-0 bg-transparent"
                />
              </div>
            )}

            {task.labels && task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.labels.map((label, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {label}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>

          {/* Sticker Layer */}
          {task.stickers && task.stickers.length > 0 && (
            <StickerLayer
              stickers={task.stickers}
              onStickerMove={handleStickerMove}
              onStickerRemove={handleStickerRemove}
              containerClassName="p-3"
            />
          )}
        </Card>

        {/* Floating action buttons */}
        <div
          className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-background/80 hover:bg-background"
            onClick={(e) => {
              e.stopPropagation()
              setShowEditModal(true)
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-background/80 hover:bg-background text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              setShowDeleteConfirm(true)
            }}
            disabled={isDeleting}
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Edit Modal */}
      <TaskEditModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        task={task}
        boardId={boardId}
        columnId={columnId}
        onSave={() => {
          // Refresh the task data if needed
          console.log("[KanbanTask] Task updated successfully")
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{task.title}"? You can undo this action for a short time after deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDeleteTask()
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Task"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
