"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cardFaceBrief, descriptionLooksLikeHtml } from "@/lib/card-copy"
import { isDoneColumnTitle } from "@/lib/task-dates"
import { getTaskProject } from "@/lib/projects"
import type { Task } from "@/lib/types"
import { TaskDateLine } from "./task-date-line"
import { FormattedDescription } from "./formatted-description"
import { ProjectChip } from "./project-chip"
import { TaskShortIdBadge } from "./task-short-id"

type TaskDetailModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task
  columnTitle?: string
  onEdit?: () => void
}

export function TaskDetailModal({ open, onOpenChange, task, columnTitle, onEdit }: TaskDetailModalProps) {
  const project = getTaskProject(task)
  const title = project?.displayTitle || task.title
  const description = task.description?.trim() || ""
  const brief = cardFaceBrief(task)
  const showCompleted = isDoneColumnTitle(columnTitle)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-[#1f1233] border-white/15 text-white"
        data-testid="task-detail"
      >
        <DialogHeader className="space-y-3 text-left">
          <div className="flex flex-wrap items-center gap-2">
            {project ? <ProjectChip project={project.project} /> : null}
            <TaskShortIdBadge taskId={task.id} />
            <span className="text-[11px] uppercase tracking-[0.16em] text-white/50">What James must do</span>
          </div>
          <DialogTitle className="text-xl leading-snug text-white">{title}</DialogTitle>
          {brief ? (
            <DialogDescription className="text-sm text-white/70">{brief}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">Task details</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-1.5">Dates</p>
            <TaskDateLine
              createdAt={task.createdAt}
              completedAt={task.completedAt}
              showCompleted={showCompleted}
              variant="detail"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-1.5">Project</p>
            <p className="text-sm text-white">{project?.project || "Unassigned"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-1.5">Title</p>
            <p className="text-sm text-white">{title}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-1.5">Description</p>
            {description ? (
              descriptionLooksLikeHtml(description) ? (
                <FormattedDescription
                  description={description}
                  collapsible={false}
                  className="p-0 border-0 bg-transparent overflow-visible text-white/85"
                />
              ) : (
                <p className="text-sm leading-relaxed text-white/85 whitespace-pre-wrap" data-testid="task-detail-description">
                  {description}
                </p>
              )
            ) : (
              <p className="text-sm italic text-white/45">No description yet. Edit the card to add the full ask.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          {onEdit ? (
            <Button
              onClick={() => {
                onOpenChange(false)
                onEdit()
              }}
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              Edit
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
