"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Loader2, X, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updateTask, type Task } from "@/lib/db-service"
import { Badge } from "@/components/ui/badge"
import { descriptionForEditor, isLocalPreviewBoard } from "@/lib/card-copy"
import { matchOpsProject, upsertProjectLabel } from "@/lib/projects"
import { ProjectPicker } from "@/components/project-chip"
import { EditorErrorBoundary } from "@/components/editor-error-boundary"

type TaskEditModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task
  boardId: string
  columnId: string
  onSave: (updatedTask: Task) => void
}

export function TaskEditModal({ open, onOpenChange, task, boardId, columnId, onSave }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title)
  const [brief, setBrief] = useState(task.brief ?? "")
  const [description, setDescription] = useState("")
  const [labels, setLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    setTitle(task.title)
    setBrief(task.brief ?? "")
    setDescription(descriptionForEditor(task.description))
    setLabels(Array.isArray(task.labels) ? task.labels : [])
  }, [task, open])

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Task title cannot be empty",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const updates: Partial<Omit<Task, "id" | "createdAt" | "createdBy">> = {
        title,
        brief,
        description,
        labels,
      }

      if (!isLocalPreviewBoard(boardId)) {
        const result = await updateTask(boardId, columnId, task.id, updates)
        if (!result.success) {
          throw new Error(result.error || "Failed to update task")
        }
      }

      toast({
        title: "Task updated",
        description: "Task has been updated successfully",
      })

      const updatedTaskData: Task = {
        ...task,
        ...updates,
        updatedAt: new Date().toISOString(),
      }

      onSave(updatedTaskData)
      onOpenChange(false)
    } catch (error) {
      console.error("[TaskEditModal] Error updating task:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update task. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddLabel = () => {
    if (!newLabel.trim()) return
    if (!labels.includes(newLabel.trim())) {
      setLabels([...labels, newLabel.trim()])
    }
    setNewLabel("")
  }

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter((label) => label !== labelToRemove))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-neutral-900 dark:text-white"
        data-testid="task-edit-modal"
      >
        <EditorErrorBoundary>
          <DialogHeader>
            <DialogTitle className="text-xl">Edit Task</DialogTitle>
            <DialogDescription className="dark:text-neutral-400">
              Update the task details. Title and brief show on the card; description is the full ask.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title" className="dark:text-neutral-300">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                disabled={isLoading}
                className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-500"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="brief" className="dark:text-neutral-300">
                Brief (shown on the card, 1–2 lines)
              </Label>
              <Input
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="What James should do, in one glance"
                disabled={isLoading}
                className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-500"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description" className="dark:text-neutral-300">
                Description (full ask)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a detailed description..."
                disabled={isLoading}
                rows={8}
                className="min-h-[160px] dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-500"
              />
            </div>

            <div className="grid gap-2">
              <Label className="dark:text-neutral-300">Project</Label>
              <ProjectPicker
                value={labels.map((label) => matchOpsProject(label)).find(Boolean) ?? null}
                onChange={(project) => setLabels(upsertProjectLabel(labels, project))}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="labels" className="dark:text-neutral-300">
                Labels
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {labels.map((label, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-200 hover:dark:bg-neutral-600"
                  >
                    {label}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 rounded-full ml-1 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                      onClick={() => handleRemoveLabel(label)}
                    >
                      <span className="sr-only">Remove</span>
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="newLabel"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Add a label"
                  className="flex-1 dark:bg-neutral-800 dark:border-neutral-700 dark:text-white dark:placeholder:text-neutral-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      handleAddLabel()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddLabel}
                  disabled={!newLabel.trim()}
                  className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white hover:dark:bg-neutral-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="dark:bg-neutral-800 dark:border-neutral-700 dark:text-white hover:dark:bg-neutral-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              data-testid="task-edit-save"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </EditorErrorBoundary>
      </DialogContent>
    </Dialog>
  )
}
