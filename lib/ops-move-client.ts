export type PersistOpsTaskMoveInput = {
  taskId: string
  destColumnId: string
  destIndex: number
  beforeTaskId: string | null
}

export async function persistOpsTaskMove(input: PersistOpsTaskMoveInput) {
  const response = await fetch(`/api/ops/tasks/${encodeURIComponent(input.taskId)}/move`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      columnId: input.destColumnId,
      position: input.destIndex,
      beforeTaskId: input.beforeTaskId,
    }),
  })

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null
    throw new Error(typeof payload?.error === "string" ? payload.error : "Failed to move task")
  }
}
