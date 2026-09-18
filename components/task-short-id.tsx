"use client"

import { useState } from "react"
import { taskShortId } from "@/lib/task-short-id"
import { cn } from "@/lib/utils"

type TaskShortIdProps = {
  taskId: string
  className?: string
  copyable?: boolean
}

export function TaskShortIdBadge({ taskId, className, copyable = true }: TaskShortIdProps) {
  const shortId = taskShortId(taskId)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shortId)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  const label = copied ? "Copied" : shortId

  if (!copyable) {
    return (
      <span
        data-testid="task-short-id"
        data-short-id={shortId}
        className={cn(
          "font-mono text-[10px] leading-none tracking-wide text-pink-200/90 bg-white/10 border border-white/15 rounded px-1.5 py-0.5",
          className,
        )}
      >
        {shortId}
      </span>
    )
  }

  return (
    <button
      type="button"
      data-testid="task-short-id"
      data-short-id={shortId}
      title={`Copy ${shortId}`}
      aria-label={`Card id ${shortId}`}
      className={cn(
        "font-mono text-[10px] leading-none tracking-wide text-pink-200/90 bg-white/10 border border-white/15 rounded px-1.5 py-0.5 hover:bg-white/20",
        className,
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation()
        event.preventDefault()
        void copy()
      }}
    >
      {label}
    </button>
  )
}
