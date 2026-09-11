export type StickerPosition = {
  x: number
  y: number
}

export type PlacedSticker = {
  id: string
  stickerId: string
  url: string
  position: StickerPosition
  color?: string
}

export type Task = {
  id: string
  title: string
  description: string
  labels: string[]
  stickers?: PlacedSticker[]
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  archivedAt?: number
  columnId?: string
  boardId?: string
  order?: number
}

export type Column = {
  id: string
  title: string
  tasks: Task[]
  order: number
  stickers?: PlacedSticker[]
}

export type Board = {
  id: string
  title: string
  description?: string
  slug?: string | null
  columns: Column[]
  createdAt: string
  updatedAt: string
  createdBy: string
  sharedWith: string[]
  archivedTasks?: Task[]
  stickers?: PlacedSticker[]
}

export type BoardSummary = {
  id: string
  title: string
  updatedAt: string
  tasks: number
  slug?: string | null
}

export function extractTasksFromBoard(board: Board): Task[] {
  if (!board?.columns) return []
  return board.columns.reduce((acc, column) => {
    const tasksWithContext = (column.tasks || []).map((task) => ({
      ...task,
      columnId: column.id,
      boardId: board.id,
    }))
    return acc.concat(tasksWithContext)
  }, [] as Task[])
}
