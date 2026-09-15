"use client"

import { useState, useRef, useEffect } from "react"
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
import { deleteTask, type Task } from "@/lib/db-service"
import { cardFaceBrief } from "@/lib/card-copy"
import { getTaskProject, projectBarClass } from "@/lib/projects"
import { cn } from "@/lib/utils"
import { ProjectChip } from "./project-chip"
import { EditorErrorBoundary } from "./editor-error-boundary"
import { TaskDetailModal } from "./task-detail-modal"
import { TaskEditModal } from "./task-edit-modal"
import { StickerLayer } from "./sticker-layer"
import { useMobile } from "@/hooks/use-mobile"
import type { StickerItem } from "./sticker-panel"

type KanbanCardProps = {
  task: Task
  boardId: string
  columnId: string
  isDropTarget?: boolean
  className?: string
  onStickerAdd?: (sticker: StickerItem) => void
  onStickerMove?: (stickerId: string, position: { x: number; y: number }) => void
  onStickerRemove?: (stickerId: string) => void
  onDeleted?: () => void
  onUpdated?: (task: Task) => void
}

export function KanbanCard({
  task,
  boardId,
  columnId,
  isDropTarget = false,
  className,
  onStickerAdd,
  onStickerMove,
  onStickerRemove,
  onDeleted,
  onUpdated,
}: KanbanCardProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDragTooltip, setShowDragTooltip] = useState(false)
  const taskRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { addUndoAction, clearUndoAction } = useUndo()
  const isMobile = useMobile()

  // Set up sortable with enhanced options for better mobile support
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, active } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
      columnId,
    },
    // Enhanced touch sensor options for better mobile experience
    animateLayoutChanges: () => false, // Disable layout animations for smoother dragging
  })

  // Show drag tooltip briefly when dragging starts
  useEffect(() => {
    if (isDragging && !showDragTooltip) {
      setShowDragTooltip(true)
      const timer = setTimeout(() => setShowDragTooltip(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [isDragging, showDragTooltip])

  // Enhanced style for dragging with smoother animations
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
    zIndex: isDragging ? 999 : undefined,
    opacity: isDragging ? 0.8 : 1,
    scale: isDragging ? 1.02 : 1,
  }

  const project = getTaskProject(task)
  const extraLabels = (task.labels || []).filter((label) => label !== project?.project)
  const brief = cardFaceBrief(task)
  const displayTitle = project?.displayTitle || task.title

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
      onDeleted?.()
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

  // Handle task update
  const handleTaskUpdated = (updatedTask: Task) => {
    setShowEditModal(false)
    onUpdated?.(updatedTask)
    toast({
      title: "Task updated",
      description: "Your changes have been saved successfully.",
    })
  }

  return (
    <>
      <div className="relative group">
        {/* Drag tooltip that appears when dragging starts */}
        {showDragTooltip && isDragging && (
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs py-1 px-2 rounded z-[1000] whitespace-nowrap">
            Drag up/down to reorder or to another column
          </div>
        )}

        {/* Card component with enhanced animations */}
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
            "cursor-pointer relative transition-all duration-200 overflow-visible pl-1",
            "glassmorphic-card",
            isDragging && "shadow-lg ring-2 ring-white/20",
            isDropTarget && "ring-2 ring-white/50 ring-offset-2 bg-white/5",
            "hover:shadow-md",
            className,
          )}
          data-task-id={task.id}
          data-column-id={columnId}
          data-testid="ops-task-card"
          onClick={() => {
            if (!isDragging) setShowDetail(true)
          }}
        >
          <span
            aria-hidden
            className={cn("absolute inset-y-0 left-0 w-1.5 rounded-l-md", projectBarClass(project?.project))}
          />
          <CardContent className="p-3 pl-4 space-y-2 overflow-visible">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div
                  className={cn(
                    "mt-0.5 p-1 rounded text-white/70 shrink-0 cursor-grab active:cursor-grabbing",
                    "group-hover:bg-white/10 group-hover:text-white transition-colors",
                    isDragging && "bg-white/10 text-white",
                  )}
                  {...attributes}
                  {...listeners}
                  onClick={(event) => event.stopPropagation()}
                >
                  <GripVertical className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  {project ? <ProjectChip project={project.project} /> : null}
                  <h4 className="text-sm font-medium leading-snug text-white break-words">{displayTitle}</h4>
                  {brief ? (
                    <p className="text-xs leading-snug text-white/75 line-clamp-2 break-words" data-testid="task-brief">
                      {brief}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {extraLabels.length > 0 && (
              <div className="flex flex-wrap gap-1 ml-6">
                {extraLabels.map((label, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="text-xs bg-white/20 text-white hover:bg-white/30"
                    onClick={(e) => e.stopPropagation()}
                  >
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

          {/* Visual indicator for dragging state */}
          {isDragging && <div className="absolute inset-0 bg-white/5 pointer-events-none rounded-md"></div>}
        </Card>

        {/* Floating action buttons with improved styling */}
        <div
          className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag when clicking buttons
          onTouchStart={(e) => e.stopPropagation()} // Prevent drag on touch devices
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 bg-black/30 hover:bg-black/50 text-white shadow-sm"
            data-testid="task-edit-button"
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
            className="h-6 w-6 bg-black/30 hover:bg-black/50 text-white shadow-sm hover:text-white"
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

      <TaskDetailModal
        open={showDetail}
        onOpenChange={setShowDetail}
        task={task}
        onEdit={() => setShowEditModal(true)}
      />

      <EditorErrorBoundary>
        <TaskEditModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          task={task}
          boardId={boardId}
          columnId={columnId}
          onSave={handleTaskUpdated}
        />
      </EditorErrorBoundary>

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
