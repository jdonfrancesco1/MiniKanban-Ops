"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft } from "lucide-react"
import { KanbanBoard } from "@/components/kanban-board" // Assuming default export
import { DemoBoardChat } from "@/components/demo-board-chat"
import type { Column as DbColumn, Task as DbTask, PlacedSticker } from "@/lib/db-service" // Import types

// Mock data for a demo board
const rawMockColumns = [
  {
    id: "todo",
    title: "To Do",
    tasks: [
      {
        id: "task-1",
        title: "Research competitors",
        description: "Look at similar products in the market",
        labels: ["research"],
      },
      {
        id: "task-2",
        title: "Create wireframes",
        description: "Design initial mockups for the app",
        labels: ["design"],
      },
      {
        id: "task-3",
        title: "Set up project repository",
        description: "Initialize Git repo and project structure",
        labels: ["setup"],
      },
    ],
  },
  {
    id: "in-progress",
    title: "In Progress",
    tasks: [
      {
        id: "task-4",
        title: "Implement authentication",
        description: "Add phone number verification flow",
        labels: ["development"],
      },
      {
        id: "task-5",
        title: "Design system setup",
        description: "Create reusable components and styles",
        labels: ["design", "development"],
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    tasks: [
      { id: "task-6", title: "Project planning", description: "Define scope and timeline", labels: ["planning"] },
      {
        id: "task-7",
        title: "Requirements gathering",
        description: "Document feature requirements",
        labels: ["planning", "research"],
      },
    ],
  },
]

// Convert the mock data to the format expected by KanbanBoard (DbColumn[], DbTask[])
const convertMockData = (): { columns: DbColumn[]; tasks: DbTask[] } => {
  const boardId = "demo-board" // Assign a boardId for tasks

  const columns: DbColumn[] = rawMockColumns.map((col, index) => ({
    id: col.id,
    title: col.title,
    order: index,
    tasks: col.tasks.map((task) => ({
      // Populate nested tasks for dbService.Column type
      ...task,
      id: task.id,
      description: task.description || "",
      labels: task.labels || [],
      stickers: [], // Default empty stickers
      createdAt: Date.now(),
      updatedAt: Date.now(),
      columnId: col.id, // Assign columnId to each task
      boardId: boardId, // Assign boardId to each task
    })),
    stickers: [], // Default empty stickers for column
  }))

  const tasks: DbTask[] = columns.flatMap((col) => col.tasks) // Extract flat list of tasks

  return { columns, tasks }
}

export default function DemoPage() {
  const { columns: initialColumns, tasks: initialTasks } = convertMockData()
  const [boardColumns, setBoardColumns] = useState<DbColumn[]>(initialColumns)
  const [boardTasks, setBoardTasks] = useState<DbTask[]>(initialTasks)
  const [boardStickers, setBoardStickers] = useState<PlacedSticker[]>([]) // Board-level stickers

  // Simplified handlers for demo page - real app uses db-service and subscriptions
  const handleColumnAdd = (title: string) => {
    const newColumn: DbColumn = {
      id: `column-${Date.now()}`,
      title,
      order: boardColumns.length,
      tasks: [],
      stickers: [],
    }
    setBoardColumns([...boardColumns, newColumn])
  }

  const handleColumnUpdate = (columnId: string, newTitle: string) => {
    setBoardColumns(boardColumns.map((col) => (col.id === columnId ? { ...col, title: newTitle } : col)))
  }

  const handleColumnDelete = (columnId: string) => {
    setBoardColumns(boardColumns.filter((col) => col.id !== columnId))
    // Also remove tasks belonging to this column from the flat task list
    setBoardTasks(boardTasks.filter((task) => task.columnId !== columnId))
  }

  const handleTaskAdd = (taskData: Partial<DbTask>, columnId: string) => {
    const newTask: DbTask = {
      id: `task-${Date.now()}`,
      title: taskData.title || "New Task",
      description: taskData.description || "",
      labels: taskData.labels || [],
      stickers: taskData.stickers || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      columnId: columnId,
      boardId: "demo-board", // Assuming a fixed boardId for demo
      ...taskData, // Spread other properties from taskData
    }
    setBoardTasks([...boardTasks, newTask])
    // Also add to the column's task list if columns store them directly (they do in DbColumn)
    setBoardColumns(boardColumns.map((col) => (col.id === columnId ? { ...col, tasks: [...col.tasks, newTask] } : col)))
  }

  const handleTaskUpdate = (updatedTask: DbTask) => {
    setBoardTasks(boardTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)))
    // Update in column's task list as well
    setBoardColumns(
      boardColumns.map((col) => ({
        ...col,
        tasks: col.tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t)),
      })),
    )
  }

  const handleTaskDelete = (taskId: string, columnId: string) => {
    setBoardTasks(boardTasks.filter((task) => task.id !== taskId))
    // Remove from column's task list
    setBoardColumns(
      boardColumns.map((col) =>
        col.id === columnId ? { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) } : col,
      ),
    )
  }

  const handleTaskMove = (taskId: string, newColumnId: string, newPosition: number, oldColumnId: string) => {
    // This is a simplified version for local state. Real dnd is more complex.
    let taskToMove = boardTasks.find((t) => t.id === taskId)
    if (!taskToMove) return

    taskToMove = { ...taskToMove, columnId: newColumnId }

    const newBoardTasks = boardTasks.filter((t) => t.id !== taskId)
    // Basic insertion, proper reordering would involve splicing at newPosition
    newBoardTasks.push(taskToMove)
    setBoardTasks(newBoardTasks)

    // Update tasks in columns
    setBoardColumns((prevCols) => {
      const nextCols = prevCols.map((col) => {
        if (col.id === oldColumnId) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) }
        }
        if (col.id === newColumnId) {
          // Add task to new column (simplified, doesn't respect newPosition)
          const taskExists = col.tasks.find((t) => t.id === taskId)
          if (!taskExists) {
            return { ...col, tasks: [...col.tasks, taskToMove!] }
          }
        }
        return col
      })
      return nextCols
    })
  }

  const handleColumnMove = (columnId: string, newPosition: number) => {
    // Simplified: re-sort columns based on new order
    const movedColumn = boardColumns.find((col) => col.id === columnId)
    if (!movedColumn) return

    const otherColumns = boardColumns.filter((col) => col.id !== columnId)
    otherColumns.splice(newPosition, 0, movedColumn)
    const reorderedColumns = otherColumns.map((col, index) => ({ ...col, order: index }))
    setBoardColumns(reorderedColumns)
  }

  const handleStickerAdd = (sticker: PlacedSticker) => {
    setBoardStickers([...boardStickers, sticker])
  }

  const handleStickerMove = (sticker: PlacedSticker) => {
    setBoardStickers(boardStickers.map((s) => (s.id === sticker.id ? sticker : s)))
  }

  const handleStickerRemove = (stickerId: string) => {
    setBoardStickers(boardStickers.filter((s) => s.id !== stickerId))
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#1a0b2e]/95 backdrop-blur supports-[backdrop-filter]:bg-[#1a0b2e]/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-white/70 hover:text-white" asChild>
              <Link href="/">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="font-bold text-xl text-white">Demo Board</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white" asChild>
              <Link href="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6 overflow-x-auto">
        <div className="bg-[#2a1b3e] p-4 rounded-lg mb-6 border border-white/10">
          <p className="text-sm text-white/70">
            This is a demo of MiniKanban. Try dragging tasks between columns, adding new tasks, or editing existing
            ones. To create your own boards and collaborate with others,{" "}
            <Link href="/auth" className="text-pink-400 hover:text-pink-300 underline">
              get started
            </Link>
            .
          </p>
        </div>
        <KanbanBoard
          columns={boardColumns}
          tasks={boardTasks} // Pass the flat list of tasks
          boardId="demo-board"
          onColumnAdd={handleColumnAdd}
          onColumnUpdate={handleColumnUpdate}
          onColumnDelete={handleColumnDelete}
          onTaskAdd={handleTaskAdd}
          onTaskUpdate={handleTaskUpdate}
          onTaskDelete={handleTaskDelete}
          onTaskMove={handleTaskMove}
          onColumnMove={handleColumnMove}
          stickers={boardStickers}
          onStickerAdd={handleStickerAdd}
          onStickerMove={handleStickerMove}
          onStickerRemove={handleStickerRemove}
        />
      </main>
      <DemoBoardChat />
    </div>
  )
}
