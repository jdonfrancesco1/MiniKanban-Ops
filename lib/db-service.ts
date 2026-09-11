import { Timestamp } from "./firebase"

// Types
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
  createdAt?: any
  updatedAt?: any
  createdBy?: string
  archivedAt?: number
  columnId?: string // Add columnId to Task type
  boardId?: string // Add boardId to Task type
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
  columns: Column[]
  createdAt: any
  updatedAt: any
  createdBy: string
  sharedWith: string[]
  archivedTasks?: Task[]
  stickers?: PlacedSticker[]
}

// Mock data
const mockBoards: Record<string, Board> = {
  "board-1": {
    id: "board-1",
    title: "Project Planning",
    description: "This is a project planning board for our team. Use it to track tasks and progress.",
    columns: [
      {
        id: "column-1",
        title: "To Do",
        tasks: [
          {
            id: "task-1",
            title: "Research competitors",
            description: "Look at similar products in the market and analyze their features.",
            labels: ["research"],
          },
          {
            id: "task-2",
            title: "Create wireframes",
            description: "Design initial mockups for the app interface.",
            labels: ["design"],
          },
        ],
        order: 0,
      },
      {
        id: "column-2",
        title: "In Progress",
        tasks: [
          {
            id: "task-3",
            title: "Implement authentication",
            description: "Add phone number verification flow using Firebase.",
            labels: ["development"],
          },
        ],
        order: 1,
      },
      {
        id: "column-3",
        title: "Done",
        tasks: [
          {
            id: "task-4",
            title: "Project planning",
            description: "Define scope and timeline for the project.",
            labels: ["planning"],
          },
        ],
        order: 2,
      },
    ],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: "mock-user-id",
    sharedWith: [],
  },
}

// Board Operations
export async function getBoard(boardId: string): Promise<Board> {
  // Return the mock board or create a new one if it doesn't exist
  if (!mockBoards[boardId]) {
    await createBoard("New Board")
  }

  return mockBoards[boardId] || mockBoards["board-1"]
}

export async function createBoard(title: string, useProjectPlanningTemplate = false) {
  const boardId = `board-${Date.now()}`
  const timestamp = Timestamp.now()

  // Default columns
  let columns: Column[] = []
  let description = ""

  if (useProjectPlanningTemplate) {
    // Use the project planning template
    description = "This is a project planning board for our team. Use it to track tasks and progress."
    columns = [
      {
        id: `column-${Date.now()}-1`,
        title: "To Do",
        tasks: [
          {
            id: `task-${Date.now()}-1`,
            title: "Research competitors",
            description: "Look at similar products in the market and analyze their features.",
            labels: ["research"],
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          {
            id: `task-${Date.now()}-2`,
            title: "Create wireframes",
            description: "Design initial mockups for the app interface.",
            labels: ["design"],
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        order: 0,
      },
      {
        id: `column-${Date.now()}-2`,
        title: "In Progress",
        tasks: [
          {
            id: `task-${Date.now()}-3`,
            title: "Implement authentication",
            description: "Add phone number verification flow using Firebase.",
            labels: ["development"],
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        order: 1,
      },
      {
        id: `column-${Date.now()}-3`,
        title: "Done",
        tasks: [
          {
            id: `task-${Date.now()}-4`,
            title: "Project planning",
            description: "Define scope and timeline for the project.",
            labels: ["planning"],
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        ],
        order: 2,
      },
    ]
    title = "Project Planning" // Use the template title
  } else {
    // Use default empty columns
    columns = [
      {
        id: `column-${Date.now()}-1`,
        title: "To Do",
        tasks: [],
        order: 0,
      },
      {
        id: `column-${Date.now()}-2`,
        title: "In Progress",
        tasks: [],
        order: 1,
      },
      {
        id: `column-${Date.now()}-3`,
        title: "Done",
        tasks: [],
        order: 2,
      },
    ]
  }

  const boardData: Board = {
    id: boardId,
    title,
    description,
    columns,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: "mock-user-id",
    sharedWith: [],
  }

  mockBoards[boardId] = boardData

  return {
    id: boardId,
    title,
    updatedAt: new Date().toISOString(),
    tasks: columns.reduce((acc, col) => acc + col.tasks.length, 0),
  }
}

export async function updateBoardTitle(boardId: string, title: string) {
  if (mockBoards[boardId]) {
    mockBoards[boardId].title = title
    mockBoards[boardId].updatedAt = Timestamp.now()
  }

  return { success: true }
}

export async function updateBoardDescription(boardId: string, description: string) {
  if (mockBoards[boardId]) {
    mockBoards[boardId].description = description
    mockBoards[boardId].updatedAt = Timestamp.now()
  }

  return { success: true }
}

export async function updateBoardColumns(boardId: string, columns: Column[]) {
  if (mockBoards[boardId]) {
    mockBoards[boardId].columns = columns
    mockBoards[boardId].updatedAt = Timestamp.now()
  }

  return { success: true }
}

export async function deleteBoard(boardId: string) {
  if (mockBoards[boardId]) {
    delete mockBoards[boardId]
  }

  return { success: true }
}

export async function getUserBoards() {
  return Object.values(mockBoards).map((board) => ({
    id: board.id,
    title: board.title,
    updatedAt: new Date().toISOString(),
    tasks: board.columns.reduce((acc, col) => acc + col.tasks.length, 0),
  }))
}

export function subscribeToBoard(boardId: string, callback: (board: Board) => void) {
  // Immediately call with mock data
  setTimeout(() => {
    if (mockBoards[boardId]) {
      callback(mockBoards[boardId])
    }
  }, 0)

  // Return mock unsubscribe function
  return () => {}
}

// Column Operations
export async function addColumn(boardId: string, title: string) {
  if (!mockBoards[boardId]) return null

  const columnId = `column-${Date.now()}`
  const newColumn: Column = {
    id: columnId,
    title,
    tasks: [],
    order: mockBoards[boardId].columns.length,
  }

  // Add the column to the board
  mockBoards[boardId].columns.push(newColumn)
  mockBoards[boardId].updatedAt = Timestamp.now()

  // Make sure to persist the board data
  console.log(`[db-service] Column added to board ${boardId}:`, newColumn)
  console.log(`[db-service] Updated board:`, mockBoards[boardId])

  return newColumn
}

export async function updateColumnTitle(boardId: string, columnId: string, title: string) {
  if (!mockBoards[boardId]) return { success: false, error: "Board not found" }

  const column = mockBoards[boardId].columns.find((col) => col.id === columnId)
  if (!column) return { success: false, error: "Column not found" }

  column.title = title
  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true }
}

export async function deleteColumn(boardId: string, columnId: string) {
  if (!mockBoards[boardId]) return { success: false, error: "Board not found" }

  const columnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnId)
  if (columnIndex === -1) return { success: false, error: "Column not found" }

  // Store the column before removing it (for potential restoration)
  const removedColumn = { ...mockBoards[boardId].columns[columnIndex] }

  // Remove the column
  mockBoards[boardId].columns.splice(columnIndex, 1)

  // Reorder columns
  mockBoards[boardId].columns.forEach((col, index) => {
    col.order = index
  })

  mockBoards[boardId].updatedAt = Timestamp.now()
  return { success: true, removedColumn }
}

export async function restoreColumn(boardId: string, column: Column) {
  console.log("[db-service] Restoring column to board:", boardId, "column:", column)

  if (!mockBoards[boardId]) {
    console.error("[db-service] Board not found:", boardId)
    return { success: false, error: "Board not found" }
  }

  // Create a deep copy of the column to avoid reference issues
  const columnCopy = JSON.parse(JSON.stringify(column))

  // Check if a column with the same ID already exists
  const existingColumnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnCopy.id)
  if (existingColumnIndex !== -1) {
    console.error("[db-service] Column already exists:", columnCopy.id)
    return { success: false, error: "Column already exists" }
  }

  // Add the column back to the board
  mockBoards[boardId].columns.push(columnCopy)

  // Sort columns by order
  mockBoards[boardId].columns.sort((a, b) => a.order - b.order)

  // Ensure order property is sequential
  mockBoards[boardId].columns.forEach((col, index) => {
    col.order = index
  })

  mockBoards[boardId].updatedAt = Timestamp.now()
  console.log("[db-service] Column restored successfully. Updated board:", mockBoards[boardId])

  return { success: true }
}

// Task Operations
export async function addTask(
  boardId: string,
  columnId: string,
  task: Omit<Task, "id" | "createdAt" | "updatedAt" | "createdBy">,
) {
  console.log(`[db-service] Adding task to board ${boardId}, column ${columnId}:`, task)

  if (!mockBoards[boardId]) {
    console.error(`[db-service] Board not found: ${boardId}`)
    return null
  }

  const columnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnId)
  if (columnIndex === -1) {
    console.error(`[db-service] Column not found: ${columnId} in board ${boardId}`)
    console.log(
      `[db-service] Available columns:`,
      mockBoards[boardId].columns.map((c) => c.id),
    )
    return null
  }

  const taskId = `task-${Date.now()}`
  const newTask: Task = {
    id: taskId,
    title: task.title,
    description: task.description || "",
    labels: task.labels || [],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: "mock-user-id",
    columnId: columnId,
    boardId: boardId,
  }

  // Add the task to the column
  mockBoards[boardId].columns[columnIndex].tasks.push(newTask)
  mockBoards[boardId].updatedAt = Timestamp.now()

  console.log(`[db-service] Task added successfully:`, newTask)
  console.log(`[db-service] Updated column:`, mockBoards[boardId].columns[columnIndex])

  return newTask
}

export async function updateTask(
  boardId: string,
  columnId: string,
  taskId: string,
  updates: Partial<Omit<Task, "id" | "createdAt" | "createdBy" | "archivedAt">>,
) {
  if (!mockBoards[boardId]) return { success: false, error: "Board not found" }

  // Find the task regardless of the column
  let task: Task | undefined
  let columnIndex: number | undefined

  for (let i = 0; i < mockBoards[boardId].columns.length; i++) {
    const col = mockBoards[boardId].columns[i]
    const taskIndex = col.tasks.findIndex((t) => t.id === taskId)
    if (taskIndex !== -1) {
      task = col.tasks[taskIndex]
      columnIndex = i
      break
    }
  }

  if (!task || columnIndex === undefined) {
    return { success: false, error: "Task not found" }
  }

  // Ensure description is a string
  if (updates.description !== undefined && typeof updates.description !== "string") {
    updates.description = String(updates.description || "")
  }

  // Update the task with the new values
  mockBoards[boardId].columns[columnIndex].tasks = mockBoards[boardId].columns[columnIndex].tasks.map((t) =>
    t.id === taskId ? { ...t, ...updates, updatedAt: Timestamp.now() } : t,
  )

  // Update the columnId if it's being changed
  if (updates.columnId && updates.columnId !== columnId) {
    // Remove the task from the old column
    mockBoards[boardId].columns[columnIndex].tasks = mockBoards[boardId].columns[columnIndex].tasks.filter(
      (t) => t.id !== taskId,
    )

    // Find the new column
    const newColumnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === updates.columnId)
    if (newColumnIndex === -1) {
      return { success: false, error: "New column not found" }
    }

    // Add the task to the new column
    mockBoards[boardId].columns[newColumnIndex].tasks.push({ ...task, ...updates, updatedAt: Timestamp.now() })
  }

  mockBoards[boardId].updatedAt = Timestamp.now()
  return { success: true }
}

export async function deleteTask(boardId: string, columnId: string, taskId: string) {
  if (!mockBoards[boardId]) return { success: false, error: "Board not found" }

  const columnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnId)
  if (columnIndex === -1) return { success: false, error: "Column not found" }

  const taskIndex = mockBoards[boardId].columns[columnIndex].tasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return { success: false, error: "Task not found" }

  // Get a copy of the task before removing it
  const removedTask = { ...mockBoards[boardId].columns[columnIndex].tasks[taskIndex] }

  // Set archivedAt timestamp
  removedTask.archivedAt = Date.now()

  // Add to archived tasks
  if (!mockBoards[boardId].archivedTasks) {
    mockBoards[boardId].archivedTasks = []
  }
  mockBoards[boardId].archivedTasks.push(removedTask)

  // Remove the task
  mockBoards[boardId].columns[columnIndex].tasks.splice(taskIndex, 1)
  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true, removedTask }
}

export async function restoreTask(boardId: string, columnId: string, task: Task) {
  if (!mockBoards[boardId]) return { success: false, error: "Board not found" }

  // Find the column
  const columnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnId)
  if (columnIndex === -1) {
    // If the original column doesn't exist anymore, find or create a "To Do" column
    let todoColumnIndex = mockBoards[boardId].columns.findIndex((col) => col.title === "To Do")

    if (todoColumnIndex === -1) {
      // Create a new To Do column if it doesn't exist
      const newColumn: Column = {
        id: `column-${Date.now()}`,
        title: "To Do",
        tasks: [],
        order: 0,
      }

      mockBoards[boardId].columns.unshift(newColumn)
      todoColumnIndex = 0

      // Reorder other columns
      for (let i = 1; i < mockBoards[boardId].columns.length; i++) {
        mockBoards[boardId].columns[i].order = i
      }
    }

    // Add to To Do column
    mockBoards[boardId].columns[todoColumnIndex].tasks.push(task)
    mockBoards[boardId].updatedAt = Timestamp.now()
    return { success: true }
  }

  // Add the task back to the original column
  mockBoards[boardId].columns[columnIndex].tasks.push(task)
  mockBoards[boardId].updatedAt = Timestamp.now()

  // Remove from archived tasks
  mockBoards[boardId].archivedTasks = mockBoards[boardId].archivedTasks?.filter((t) => t.id !== task.id)

  return { success: true }
}

export async function permanentlyDeleteTask(boardId: string, taskId: string) {
  if (!mockBoards[boardId]) return { success: false, error: "Board not found" }

  // Remove from archived tasks
  mockBoards[boardId].archivedTasks = mockBoards[boardId].archivedTasks?.filter((t) => t.id !== taskId)

  mockBoards[boardId].updatedAt = Timestamp.now()
  return { success: true }
}

export async function moveTask(
  boardId: string,
  sourceColumnId: string,
  taskId: string,
  destinationColumnId: string,
  targetPosition: number,
) {
  if (!mockBoards[boardId]) return { success: false }

  const sourceColumnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === sourceColumnId)
  const destColumnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === destinationColumnId)

  if (sourceColumnIndex === -1 || destColumnIndex === -1) return { success: false }

  const taskIndex = mockBoards[boardId].columns[sourceColumnIndex].tasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return { success: false }

  const task = mockBoards[boardId].columns[sourceColumnIndex].tasks[taskIndex]

  // Remove from source
  mockBoards[boardId].columns[sourceColumnIndex].tasks.splice(taskIndex, 1)

  // Add to destination at the specified position
  const destTasks = [...mockBoards[boardId].columns[destColumnIndex].tasks]
  destTasks.splice(targetPosition, 0, {
    ...task,
    updatedAt: Timestamp.now(),
  })

  mockBoards[boardId].columns[destColumnIndex].tasks = destTasks
  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true }
}

// Sharing Operations
export async function shareBoard(boardId: string, userPhone: string) {
  if (!mockBoards[boardId]) return { success: false }

  // For demo purposes, we'll just add a placeholder user ID
  const userId = `user-${Date.now()}`

  mockBoards[boardId].sharedWith.push(userId)
  mockBoards[boardId].updatedAt = Timestamp.now()

  return {
    success: true,
    message: "Board shared with user. They will be able to access it once they sign up.",
  }
}

export async function removeUserFromBoard(boardId: string, userId: string) {
  if (!mockBoards[boardId]) return { success: false }

  mockBoards[boardId].sharedWith = mockBoards[boardId].sharedWith.filter((id) => id !== userId)
  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true }
}

export async function updateColumnOrder(boardId: string, columnIds: string[]) {
  if (!mockBoards[boardId]) return { success: false }

  // Create a map of columns by ID for quick lookup
  const columnsMap = new Map(mockBoards[boardId].columns.map((col) => [col.id, col]))

  // Create a new array of columns in the specified order
  const reorderedColumns = columnIds
    .map((id) => {
      const column = columnsMap.get(id)
      if (!column) {
        console.error(`Column with ID ${id} not found in board ${boardId}`)
        return null
      }
      return column
    })
    .filter(Boolean) as Column[]

  // Update the order property of each column
  reorderedColumns.forEach((col, index) => {
    col.order = index
  })

  // Update the board with the reordered columns
  mockBoards[boardId].columns = reorderedColumns
  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true }
}

// Sticker Operations
export async function addStickerToTask(
  boardId: string,
  columnId: string,
  taskId: string,
  sticker: { stickerId: string; url: string; position: StickerPosition; color?: string },
): Promise<{ success: boolean; stickerId?: string }> {
  if (!mockBoards[boardId]) return { success: false }

  const columnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnId)
  if (columnIndex === -1) return { success: false }

  const taskIndex = mockBoards[boardId].columns[columnIndex].tasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return { success: false }

  const task = mockBoards[boardId].columns[columnIndex].tasks[taskIndex]

  // Initialize stickers array if it doesn't exist
  if (!task.stickers) {
    task.stickers = []
  }

  // Check if we've reached the sticker limit (5 per task)
  if (task.stickers.length >= 5) {
    return { success: false }
  }

  // Generate a unique ID for the placed sticker
  const placedStickerId = `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  // Add the sticker
  task.stickers.push({
    id: placedStickerId,
    stickerId: sticker.stickerId,
    url: sticker.url,
    position: sticker.position,
    color: sticker.color,
  })

  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true, stickerId: placedStickerId }
}

export async function addStickerToColumn(
  boardId: string,
  columnId: string,
  sticker: { stickerId: string; url: string; position: StickerPosition; color?: string },
): Promise<{ success: boolean; stickerId?: string }> {
  if (!mockBoards[boardId]) return { success: false }

  const columnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnId)
  if (columnIndex === -1) return { success: false }

  const column = mockBoards[boardId].columns[columnIndex]

  // Initialize stickers array if it doesn't exist
  if (!column.stickers) {
    column.stickers = []
  }

  // Check if we've reached the sticker limit (5 per column)
  if (column.stickers.length >= 5) {
    return { success: false }
  }

  // Generate a unique ID for the placed sticker
  const placedStickerId = `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  // Add the sticker
  column.stickers.push({
    id: placedStickerId,
    stickerId: sticker.stickerId,
    url: sticker.url,
    position: sticker.position,
    color: sticker.color,
  })

  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true, stickerId: placedStickerId }
}

export async function updateTaskStickerPosition(
  boardId: string,
  columnId: string,
  taskId: string,
  stickerId: string,
  position: StickerPosition,
): Promise<{ success: boolean }> {
  if (!mockBoards[boardId]) return { success: false }

  const columnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnId)
  if (columnIndex === -1) return { success: false }

  const taskIndex = mockBoards[boardId].columns[columnIndex].tasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return { success: false }

  const task = mockBoards[boardId].columns[columnIndex].tasks[taskIndex]

  if (!task.stickers) return { success: false }

  const stickerIndex = task.stickers.findIndex((s) => s.id === stickerId)
  if (stickerIndex === -1) return { success: false }

  // Update the sticker position
  task.stickers[stickerIndex].position = position

  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true }
}

export async function updateColumnStickerPosition(
  boardId: string,
  columnId: string,
  stickerId: string,
  position: StickerPosition,
): Promise<{ success: boolean }> {
  if (!mockBoards[boardId]) return { success: false }

  const columnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnId)
  if (columnIndex === -1) return { success: false }

  const column = mockBoards[boardId].columns[columnIndex]

  if (!column.stickers) return { success: false }

  const stickerIndex = column.stickers.findIndex((s) => s.id === stickerId)
  if (stickerIndex === -1) return { success: false }

  // Update the sticker position
  column.stickers[stickerIndex].position = position

  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true }
}

export async function removeTaskSticker(
  boardId: string,
  columnId: string,
  taskId: string,
  stickerId: string,
): Promise<{ success: boolean }> {
  if (!mockBoards[boardId]) return { success: false }

  const columnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnId)
  if (columnIndex === -1) return { success: false }

  const taskIndex = mockBoards[boardId].columns[columnIndex].tasks.findIndex((t) => t.id === taskId)
  if (taskIndex === -1) return { success: false }

  const task = mockBoards[boardId].columns[columnIndex].tasks[taskIndex]

  if (!task.stickers) return { success: false }

  // Remove the sticker
  task.stickers = task.stickers.filter((s) => s.id !== stickerId)

  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true }
}

export async function removeColumnSticker(
  boardId: string,
  columnId: string,
  stickerId: string,
): Promise<{ success: boolean }> {
  if (!mockBoards[boardId]) return { success: false }

  const columnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnId)
  if (columnIndex === -1) return { success: false }

  const column = mockBoards[boardId].columns[columnIndex]

  if (!column.stickers) return { success: false }

  // Remove the sticker
  column.stickers = column.stickers.filter((s) => s.id !== stickerId)

  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true }
}

export async function updateTaskOrder(boardId: string, columnId: string, taskIds: string[]) {
  if (!mockBoards[boardId]) return { success: false, error: "Board not found" }

  const columnIndex = mockBoards[boardId].columns.findIndex((col) => col.id === columnId)
  if (columnIndex === -1) return { success: false, error: "Column not found" }

  // Get the current tasks
  const currentTasks = [...mockBoards[boardId].columns[columnIndex].tasks]

  // Create a map of tasks by ID for quick lookup
  const tasksMap = new Map(currentTasks.map((task) => [task.id, task]))

  // Create a new array of tasks in the specified order
  const reorderedTasks = taskIds
    .map((id) => {
      const task = tasksMap.get(id)
      if (!task) {
        console.error(`Task with ID ${id} not found in column ${columnId}`)
        return null
      }
      return task
    })
    .filter(Boolean) as Task[]

  // Update the column with the reordered tasks
  mockBoards[boardId].columns[columnIndex].tasks = reorderedTasks
  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true }
}

// Add the missing exports for sticker operations
export async function addBoardSticker(
  boardId: string,
  sticker: { stickerId: string; url: string; position: StickerPosition; color?: string },
): Promise<{ success: boolean; stickerId?: string }> {
  if (!mockBoards[boardId]) return { success: false }

  // Initialize stickers array if it doesn't exist
  if (!mockBoards[boardId].stickers) {
    mockBoards[boardId].stickers = []
  }

  // Check if we've reached the sticker limit (10 per board)
  if (mockBoards[boardId].stickers.length >= 10) {
    return { success: false }
  }

  // Generate a unique ID for the placed sticker
  const placedStickerId = `sticker-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  // Add the sticker
  mockBoards[boardId].stickers.push({
    id: placedStickerId,
    stickerId: sticker.stickerId,
    url: sticker.url,
    position: sticker.position,
    color: sticker.color,
  })

  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true, stickerId: placedStickerId }
}

export async function updateBoardStickerPosition(
  boardId: string,
  stickerId: string,
  position: StickerPosition,
): Promise<{ success: boolean }> {
  if (!mockBoards[boardId]) return { success: false }
  if (!mockBoards[boardId].stickers) return { success: false }

  const stickerIndex = mockBoards[boardId].stickers.findIndex((s) => s.id === stickerId)
  if (stickerIndex === -1) return { success: false }

  // Update the sticker position
  mockBoards[boardId].stickers[stickerIndex].position = position
  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true }
}

export async function removeBoardSticker(boardId: string, stickerId: string): Promise<{ success: boolean }> {
  if (!mockBoards[boardId]) return { success: false }
  if (!mockBoards[boardId].stickers) return { success: false }

  // Remove the sticker
  mockBoards[boardId].stickers = mockBoards[boardId].stickers.filter((s) => s.id !== stickerId)
  mockBoards[boardId].updatedAt = Timestamp.now()

  return { success: true }
}

// Alias for addStickerToTask for compatibility
export async function addTaskSticker(
  boardId: string,
  columnId: string,
  taskId: string,
  sticker: { stickerId: string; url: string; position: StickerPosition; color?: string },
): Promise<{ success: boolean; stickerId?: string }> {
  return addStickerToTask(boardId, columnId, taskId, sticker)
}

// Alias for addStickerToColumn for compatibility
export async function addColumnSticker(
  boardId: string,
  columnId: string,
  sticker: { stickerId: string; url: string; position: StickerPosition; color?: string },
): Promise<{ success: boolean; stickerId?: string }> {
  return addStickerToColumn(boardId, columnId, sticker)
}

// Clear mock boards for testing
// This will force the onboarding flow to show
export function clearMockBoards() {
  Object.keys(mockBoards).forEach((key) => {
    if (key !== "board-1") {
      delete mockBoards[key]
    }
  })
  return { success: true }
}

// Add this function within lib/db-service.ts, or adjust page.tsx to do this extraction.
export function extractTasksFromBoard(board: Board): Task[] {
  if (!board || !board.columns) return []
  return board.columns.reduce((acc, column) => {
    // Ensure tasks have columnId if not already present, and boardId
    const tasksWithContext = (column.tasks || []).map((task) => ({
      ...task,
      columnId: column.id,
      boardId: board.id,
    }))
    return acc.concat(tasksWithContext)
  }, [] as Task[])
}

// Add this class at the end of the file
export class DBService {
  // Static methods that wrap the existing functions
  static async getBoard(boardId: string): Promise<Board> {
    return getBoard(boardId)
  }

  static async createBoard(title: string, useProjectPlanningTemplate = false) {
    return createBoard(title, useProjectPlanningTemplate)
  }

  static async updateBoardTitle(boardId: string, title: string) {
    return updateBoardTitle(boardId, title)
  }

  static async updateBoardDescription(boardId: string, description: string) {
    return updateBoardDescription(boardId, description)
  }

  static async updateBoardColumns(boardId: string, columns: Column[]) {
    return updateBoardColumns(boardId, columns)
  }

  static async deleteBoard(boardId: string) {
    return deleteBoard(boardId)
  }

  static async getUserBoards() {
    return getUserBoards()
  }

  static subscribeToBoard(boardId: string, callback: (board: Board) => void) {
    return subscribeToBoard(boardId, callback)
  }

  static async addColumn(boardId: string, title: string) {
    return addColumn(boardId, title)
  }

  static async updateColumnTitle(boardId: string, columnId: string, title: string) {
    return updateColumnTitle(boardId, columnId, title)
  }

  static async deleteColumn(boardId: string, columnId: string) {
    return deleteColumn(boardId, columnId)
  }

  static async restoreColumn(boardId: string, column: Column) {
    return restoreColumn(boardId, column)
  }

  static async addTask(
    boardId: string,
    columnId: string,
    task: Omit<Task, "id" | "createdAt" | "updatedAt" | "createdBy">,
  ) {
    return addTask(boardId, columnId, task)
  }

  static async updateTask(
    boardId: string,
    columnId: string,
    taskId: string,
    updates: Partial<Omit<Task, "id" | "createdAt" | "createdBy" | "archivedAt">>,
  ) {
    return updateTask(boardId, columnId, taskId, updates)
  }

  static async deleteTask(boardId: string, columnId: string, taskId: string) {
    return deleteTask(boardId, columnId, taskId)
  }

  static async restoreTask(boardId: string, columnId: string, task: Task) {
    return restoreTask(boardId, columnId, task)
  }

  static async permanentlyDeleteTask(boardId: string, taskId: string) {
    return permanentlyDeleteTask(boardId, taskId)
  }

  static async moveTask(
    boardId: string,
    sourceColumnId: string,
    taskId: string,
    destinationColumnId: string,
    targetPosition: number,
  ) {
    return moveTask(boardId, sourceColumnId, taskId, destinationColumnId, targetPosition)
  }

  static async shareBoard(boardId: string, userPhone: string) {
    return shareBoard(boardId, userPhone)
  }

  static async removeUserFromBoard(boardId: string, userId: string) {
    return removeUserFromBoard(boardId, userId)
  }

  static async updateColumnOrder(boardId: string, columnIds: string[]) {
    return updateColumnOrder(boardId, columnIds)
  }

  static async addStickerToTask(
    boardId: string,
    columnId: string,
    taskId: string,
    sticker: { stickerId: string; url: string; position: StickerPosition; color?: string },
  ) {
    return addStickerToTask(boardId, columnId, taskId, sticker)
  }

  static async addStickerToColumn(
    boardId: string,
    columnId: string,
    sticker: { stickerId: string; url: string; position: StickerPosition; color?: string },
  ) {
    return addStickerToColumn(boardId, columnId, sticker)
  }

  static async updateTaskStickerPosition(
    boardId: string,
    columnId: string,
    taskId: string,
    stickerId: string,
    position: StickerPosition,
  ) {
    return updateTaskStickerPosition(boardId, columnId, taskId, stickerId, position)
  }

  static async updateColumnStickerPosition(
    boardId: string,
    columnId: string,
    stickerId: string,
    position: StickerPosition,
  ) {
    return updateColumnStickerPosition(boardId, columnId, stickerId, position)
  }

  static async removeTaskSticker(boardId: string, columnId: string, taskId: string, stickerId: string) {
    return removeTaskSticker(boardId, columnId, taskId, stickerId)
  }

  static async removeColumnSticker(boardId: string, columnId: string, stickerId: string) {
    return removeColumnSticker(boardId, columnId, stickerId)
  }

  static async updateTaskOrder(boardId: string, columnId: string, taskIds: string[]) {
    return updateTaskOrder(boardId, columnId, taskIds)
  }

  static async addBoardSticker(
    boardId: string,
    sticker: { stickerId: string; url: string; position: StickerPosition; color?: string },
  ) {
    return addBoardSticker(boardId, sticker)
  }

  static async updateBoardStickerPosition(boardId: string, stickerId: string, position: StickerPosition) {
    return updateBoardStickerPosition(boardId, stickerId, position)
  }

  static async removeBoardSticker(boardId: string, stickerId: string) {
    return removeBoardSticker(boardId, stickerId)
  }

  static async addTaskSticker(
    boardId: string,
    columnId: string,
    taskId: string,
    sticker: { stickerId: string; url: string; position: StickerPosition; color?: string },
  ) {
    return addTaskSticker(boardId, columnId, taskId, sticker)
  }

  static async addColumnSticker(
    boardId: string,
    columnId: string,
    sticker: { stickerId: string; url: string; position: StickerPosition; color?: string },
  ) {
    return addColumnSticker(boardId, columnId, sticker)
  }

  static clearMockBoards() {
    return clearMockBoards()
  }

  static extractTasksFromBoard(board: Board): Task[] {
    return extractTasksFromBoard(board)
  }
}
