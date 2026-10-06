import { nextCompletedAt } from "./task-dates.ts"

export const COLUMN_DROPPABLE_PREFIX = "column-drop:"

export type PlaceableTask = {
  id: string
  columnId?: string
  order?: number
  completedAt?: string | null
  closeSubStatus?: string | null
}

export type TaskDropTarget = {
  activeId: string
  overId: string
  overType?: string | null
  overColumnId?: string | null
  columnIds: string[]
}

export type PersistedTaskDrop = {
  taskId: string
  destColumnId: string
  sourceColumnId: string
  destIndex: number
  beforeTaskId: string | null
}

export function columnDroppableId(columnId: string) {
  return `${COLUMN_DROPPABLE_PREFIX}${columnId}`
}

export function parseColumnDroppableId(id: string): string | null {
  return id.startsWith(COLUMN_DROPPABLE_PREFIX) ? id.slice(COLUMN_DROPPABLE_PREFIX.length) : null
}

export function sortByOrder<T extends { id: string; order?: number }>(tasks: T[]): T[] {
  return [...tasks].sort((a, b) => {
    const orderDelta = (a.order ?? 0) - (b.order ?? 0)
    return orderDelta !== 0 ? orderDelta : a.id.localeCompare(b.id)
  })
}

export function resolveOverColumnId(input: {
  overId: string
  overType?: string | null
  overColumnId?: string | null
  columnIds: string[]
}): string | null {
  if (input.overColumnId) return String(input.overColumnId)
  const fromDroppable = parseColumnDroppableId(input.overId)
  if (fromDroppable) return fromDroppable
  if (input.overType === "column" || input.columnIds.includes(input.overId)) return input.overId
  return null
}

export function pickPreferredCollision<T extends { id: string | number }>(
  collisions: T[],
  columnIds: string[],
): T[] {
  if (collisions.length <= 1) return collisions
  const columnLike = new Set<string>([...columnIds, ...columnIds.map(columnDroppableId)])
  const taskHit = collisions.find((item) => !columnLike.has(String(item.id)))
  return taskHit ? [taskHit] : collisions
}

export function completedAtForColumnMove(input: {
  fromTitle?: string | null
  toTitle?: string | null
  now?: Date
}): string | null | undefined {
  const stamped = nextCompletedAt({
    fromTitle: input.fromTitle,
    toTitle: input.toTitle,
    now: input.now,
  })
  if (stamped === undefined) return undefined
  return stamped ? stamped.toISOString() : null
}

export function placeTask<T extends PlaceableTask>(
  tasks: T[],
  input: {
    taskId: string
    destColumnId: string
    destIndex: number
    completedAt?: string | null
    closeSubStatus?: string | null
  },
): T[] {
  const moving = tasks.find((task) => task.id === input.taskId)
  if (!moving) return tasks

  const destColumnId = String(input.destColumnId)
  const siblings = sortByOrder(tasks.filter((task) => String(task.columnId) === destColumnId))
  const currentIndex = siblings.findIndex((task) => task.id === input.taskId)
  const destWithout = siblings.filter((task) => task.id !== input.taskId)
  const destIndex = Math.max(0, Math.min(input.destIndex, destWithout.length))

  if (String(moving.columnId) === destColumnId && currentIndex === destIndex) {
    return tasks
  }

  const nextMoving: T = {
    ...moving,
    columnId: destColumnId,
    order: destIndex,
    ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
    ...(input.closeSubStatus !== undefined ? { closeSubStatus: input.closeSubStatus } : {}),
  }

  const grouped = new Map<string, T[]>()
  for (const task of tasks) {
    if (task.id === input.taskId) continue
    const columnId = String(task.columnId ?? "")
    if (columnId === destColumnId) continue
    const list = grouped.get(columnId) ?? []
    list.push(task)
    grouped.set(columnId, list)
  }

  const dest = [...destWithout]
  dest.splice(destIndex, 0, nextMoving)
  grouped.set(destColumnId, dest)

  const next: T[] = []
  for (const [columnId, list] of grouped) {
    const ordered = columnId === destColumnId ? list : sortByOrder(list)
    ordered.forEach((task, index) => {
      next.push({ ...task, order: index })
    })
  }
  return next
}

export function placeTaskBefore<T extends PlaceableTask>(
  tasks: T[],
  input: {
    taskId: string
    destColumnId: string
    beforeTaskId: string | null
    completedAt?: string | null
    closeSubStatus?: string | null
  },
): T[] {
  const dest = sortByOrder(
    tasks.filter((task) => String(task.columnId) === String(input.destColumnId) && task.id !== input.taskId),
  )
  let destIndex = dest.length
  if (input.beforeTaskId) {
    const index = dest.findIndex((task) => task.id === input.beforeTaskId)
    if (index >= 0) destIndex = index
  }
  return placeTask(tasks, {
    taskId: input.taskId,
    destColumnId: input.destColumnId,
    destIndex,
    completedAt: input.completedAt,
    closeSubStatus: input.closeSubStatus,
  })
}

export function applyTaskDragOver<T extends PlaceableTask>(tasks: T[], input: TaskDropTarget): T[] {
  if (input.activeId === input.overId) return tasks
  const active = tasks.find((task) => task.id === input.activeId)
  if (!active) return tasks

  const overIsTask =
    input.overType === "task" ||
    (Boolean(tasks.some((task) => task.id === input.overId)) &&
      !input.columnIds.includes(input.overId) &&
      !parseColumnDroppableId(input.overId))

  if (overIsTask) {
    const overTask = tasks.find((task) => task.id === input.overId)
    const destColumnId = input.overColumnId || overTask?.columnId
    if (!destColumnId) return tasks
    const dest = sortByOrder(tasks.filter((task) => String(task.columnId) === String(destColumnId) && task.id !== active.id))
    const overIndex = dest.findIndex((task) => task.id === input.overId)
    return placeTask(tasks, {
      taskId: active.id,
      destColumnId: String(destColumnId),
      destIndex: overIndex >= 0 ? overIndex : dest.length,
    })
  }

  const destColumnId = resolveOverColumnId(input)
  if (!destColumnId) return tasks
  if (String(active.columnId) === destColumnId && !parseColumnDroppableId(input.overId)) {
    return tasks
  }
  return placeTask(tasks, {
    taskId: active.id,
    destColumnId,
    destIndex: tasks.filter((task) => String(task.columnId) === destColumnId && task.id !== active.id).length,
  })
}

export function resolvePersistedDrop<T extends PlaceableTask>(
  originalTasks: T[],
  nextTasks: T[],
  taskId: string,
): PersistedTaskDrop | null {
  const before = originalTasks.find((task) => task.id === taskId)
  const after = nextTasks.find((task) => task.id === taskId)
  if (!before?.columnId || !after?.columnId) return null

  const dest = sortByOrder(nextTasks.filter((task) => String(task.columnId) === String(after.columnId)))
  const destIndex = dest.findIndex((task) => task.id === taskId)
  if (destIndex < 0) return null

  const originalDest = sortByOrder(originalTasks.filter((task) => String(task.columnId) === String(before.columnId)))
  const originalIndex = originalDest.findIndex((task) => task.id === taskId)
  if (String(before.columnId) === String(after.columnId) && originalIndex === destIndex) {
    return null
  }

  return {
    taskId,
    destColumnId: String(after.columnId),
    sourceColumnId: String(before.columnId),
    destIndex,
    beforeTaskId: dest[destIndex + 1]?.id ?? null,
  }
}
