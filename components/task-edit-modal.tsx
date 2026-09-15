"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import dynamic from "next/dynamic"
import "react-quill/dist/quill.snow.css"
import { Badge } from "@/components/ui/badge"
import { matchOpsProject, upsertProjectLabel } from "@/lib/projects"
import { ProjectPicker } from "@/components/project-chip"
import { renderBlocksToHtml, type RichTextBlock } from "@/components/rich-text-editor"

const ReactQuill = dynamic(() => import("react-quill"), {
  ssr: false,
  loading: () => <div className="h-[200px] w-full bg-muted/20 animate-pulse rounded-md"></div>,
})

type TaskEditModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task
  boardId: string
  columnId: string // Current columnId of the task
  onSave: (updatedTask: Task) => void // Callback with the updated task
}

export function TaskEditModal({ open, onOpenChange, task, boardId, columnId, onSave }: TaskEditModalProps) {
  const [title, setTitle] = useState(task.title)
  const [brief, setBrief] = useState(task.brief ?? "")
  const [description, setDescription] = useState("") // This will be HTML string for Quill
  const [labels, setLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      setTitle(task.title)
      setBrief(task.brief ?? "")
      let quillDescription = ""
      if (task.description) {
        try {
          // Attempt to parse description as RichTextBlock[] JSON
          const parsed = JSON.parse(task.description)
          if (
            Array.isArray(parsed) &&
            (parsed.length === 0 || (typeof parsed[0] === "object" && "type" in parsed[0] && "content" in parsed[0]))
          ) {
            quillDescription = renderBlocksToHtml(parsed as RichTextBlock[])
          } else {
            // Not RichTextBlock[] JSON, assume it's already HTML or plain text
            quillDescription = task.description
          }
        } catch (e) {
          // Parsing failed, assume it's HTML or plain text
          quillDescription = task.description
        }
      }
      setDescription(quillDescription)
      setLabels(task.labels || [])
    }
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
        description, // Description from Quill is HTML
        labels,
        // boardId and columnId are not part of 'updates' for DBService.updateTask, they are separate params
      }

      // DBService.updateTask expects (boardId, columnId, taskId, updates)
      // columnId here is the original columnId of the task. If the task can move columns,
      // this modal might need a way to update columnId too, or it's handled by drag-and-drop.
      const result = await updateTask(boardId, columnId, task.id, updates)

      if (!result.success) {
        throw new Error((result as any).error || "Failed to update task")
      }

      toast({
        title: "Task updated",
        description: "Task has been updated successfully",
      })

      // Construct the updated task object to pass to onSave callback
      const updatedTaskData: Task = {
        ...task, // original task
        ...updates, // applied updates
        updatedAt: new Date().toISOString(), // Or use timestamp from DB if available
      }

      onSave(updatedTaskData) // Call onSave with the updated task data
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

  const modules = {
    toolbar: [
      ["bold", "italic", "underline"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ align: [] }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["clean"],
    ],
  }

  const formats = ["bold", "italic", "underline", "list", "bullet", "align", "indent"]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto dark:bg-neutral-900 dark:text-white">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Task</DialogTitle>
          <DialogDescription className="dark:text-neutral-400">
            Update the task details. The description supports rich text formatting.
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
            <div className="h-[200px] bg-background dark:bg-neutral-800 rounded-md quill-container-dark">
              {typeof window !== "undefined" && (
                <ReactQuill
                  theme="snow"
                  value={description}
                  onChange={setDescription}
                  modules={modules}
                  formats={formats}
                  placeholder="Add a detailed description..."
                  className="h-full text-foreground dark:text-white" // Ensure full height for editor area
                />
              )}
            </div>
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
            onClick={handleSave}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
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
      </DialogContent>
    </Dialog>
  )
}

// Add this CSS to app/globals.css or a relevant CSS file for better dark mode Quill:
/*
.quill-container-dark .ql-toolbar {
  background-color: #2d2d2d; // Example dark background for toolbar
  border-color: #404040;
}
.quill-container-dark .ql-toolbar .ql-picker-label,
.quill-container-dark .ql-toolbar .ql-picker-item,
.quill-container-dark .ql-toolbar .ql-stroke {
  color: #e0e0e0; // Light color for icons and text in toolbar
}
.quill-container-dark .ql-toolbar .ql-picker-options {
  background-color: #2d2d2d;
  border-color: #404040;
}
.quill-container-dark .ql-container {
  border-color: #404040;
}
.quill-container-dark .ql-editor {
  color: #e0e0e0; // Light text color for editor content
  background-color: #1e1e1e; // Example dark background for editor area
}
.quill-container-dark .ql-editor.ql-blank::before {
  color: #757575; // Placeholder text color
}
*/
