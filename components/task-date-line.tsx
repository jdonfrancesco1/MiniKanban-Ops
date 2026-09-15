import { cn } from "@/lib/utils"
import { formatOpsDateLine } from "@/lib/task-dates"

type TaskDateLineProps = {
  createdAt?: string | Date | number | null
  completedAt?: string | Date | number | null
  showCompleted?: boolean
  variant?: "card" | "detail"
  className?: string
}

export function TaskDateLine({
  createdAt,
  completedAt,
  showCompleted = false,
  variant = "card",
  className,
}: TaskDateLineProps) {
  const line = formatOpsDateLine({ createdAt, completedAt, showCompleted, style: variant })
  if (!line) return null

  return (
    <p
      className={cn(
        variant === "card" ? "text-[11px] leading-tight text-white/45" : "text-sm text-white/70",
        className,
      )}
      data-testid="task-dates"
    >
      {line}
    </p>
  )
}
