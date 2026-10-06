"use client"

import { useEffect, useState } from "react"
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
import { isCloseSubStatus, type CloseSubStatus } from "@/lib/close-sub-status"
import { EMPTY_DESCRIPTION_PLACEHOLDER } from "@/lib/task-description"
import { isDoneColumnTitle } from "@/lib/task-dates"
import { CloseSubStatusOptions } from "./close-sub-status-dialog"
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
  onPickCloseSubStatus?: (closeSubStatus: CloseSubStatus) => void
}

export function TaskDetailModal({
  open,
  onOpenChange,
  task,
  columnTitle,
  onEdit,
  onPickCloseSubStatus,
}: TaskDetailModalProps) {
  const project = getTaskProject(task)
  const title = project?.displayTitle || task.title
  const description = task.description?.trim() || ""
  const brief = cardFaceBrief(task)
  const showCompleted = isDoneColumnTitle(columnTitle)
  const [pickingClose, setPickingClose] = useState(false)
  const [closeChoice, setCloseChoice] = useState("")

  useEffect(() => {
    if (!open) {
      setPickingClose(false)
      setCloseChoice("")
    }
  }, [open])

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
          <DialogTitle className="text-xl leading-snug text-white">
            {pickingClose ? (showCompleted ? "Change close status" : "How is this task closing?") : title}
          </DialogTitle>
          {brief ? (
            <DialogDescription className="text-sm text-white/70">{brief}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">Task details</DialogDescription>
          )}
        </DialogHeader>

        {pickingClose ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-white/70">
              Pick one close status. It is stored on the card when the task is in Done.
            </p>
            <CloseSubStatusOptions value={closeChoice} onValueChange={setCloseChoice} />
          </div>
        ) : null}

        <div className={pickingClose ? "hidden" : "space-y-3 py-2"}>
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
              <p className="text-sm italic text-white/45" data-testid="task-detail-description-empty">
                {EMPTY_DESCRIPTION_PLACEHOLDER}
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 mb-1.5">Close status</p>
            <p className="text-sm text-white" data-testid="task-detail-close-sub-status">
              {task.closeSubStatus || (showCompleted ? "Not set" : "Not closed")}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {pickingClose ? (
            <>
              <Button
                type="button"
                variant="ghost"
                className="text-white hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setPickingClose(false)
                  setCloseChoice("")
                }}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={!isCloseSubStatus(closeChoice)}
                data-testid="close-sub-status-confirm"
                className="bg-white text-[#1f1233] hover:bg-white/90"
                onClick={() => {
                  if (!isCloseSubStatus(closeChoice)) return
                  onPickCloseSubStatus?.(closeChoice)
                  setPickingClose(false)
                  onOpenChange(false)
                }}
              >
                {showCompleted ? "Save close status" : "Mark done"}
              </Button>
            </>
          ) : null}
          {!pickingClose && onPickCloseSubStatus ? (
            <Button
              type="button"
              data-testid="mark-done-button"
              onClick={() => {
                setCloseChoice(isCloseSubStatus(task.closeSubStatus) ? task.closeSubStatus : "")
                setPickingClose(true)
              }}
              className="bg-white text-[#1f1233] hover:bg-white/90"
            >
              {showCompleted ? "Change close status" : "Mark done"}
            </Button>
          ) : null}
          {!pickingClose && onEdit ? (
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
