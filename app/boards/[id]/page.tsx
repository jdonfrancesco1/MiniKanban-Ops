"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import KanbanBoardComponent from "@/components/kanban-board"
import { useUndoContext } from "@/contexts/undo-context"
import { useAuthContext } from "@/contexts/auth-context"
import {
  DBService,
  extractTasksFromBoard,
  type Board,
  type Column,
  type Task,
} from "@/lib/db-service"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function BoardPage() {
  const params = useParams()
  const boardId = String(params.id)
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuthContext()
  const { addUndoAction, clearUndoAction } = useUndoContext()
  const { toast } = useToast()

  const [board, setBoard] = useState<Board | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadBoardData = useCallback(async () => {
    try {
      setIsLoading(true)
      const boardData = await DBService.getBoard(boardId)
      setBoard(boardData)
      setColumns(boardData.columns || [])
      setTasks(extractTasksFromBoard(boardData))
      clearUndoAction()
      if (boardData.slug === "ops" && boardId !== "ops" && boardId !== boardData.id) {
        router.replace(`/boards/${boardData.id}`)
      }
    } catch (error) {
      console.error("Error fetching board:", error)
      toast({ title: "Error", description: "Failed to load board data.", variant: "destructive" })
      router.push("/boards")
    } finally {
      setIsLoading(false)
    }
  }, [boardId, router, clearUndoAction, toast])

  useEffect(() => {
    if (!authLoading && user) {
      void loadBoardData()
    }
  }, [authLoading, user, loadBoardData])

  const handleColumnAdd = async (title: string) => {
    const newColumn = await DBService.addColumn(boardId === "ops" ? board?.id || boardId : board?.id || boardId, title)
    if (newColumn) {
      setColumns((prev) => [...prev, newColumn])
    }
  }

  const resolvedBoardId = board?.id || boardId

  const handleColumnUpdate = async (columnId: string, newTitle: string) => {
    await DBService.updateColumnTitle(resolvedBoardId, columnId, newTitle)
    setColumns((prev) => prev.map((column) => (column.id === columnId ? { ...column, title: newTitle } : column)))
  }

  const handleColumnDelete = async (columnId: string) => {
    const result = await DBService.deleteColumn(resolvedBoardId, columnId)
    if (result.success && result.removedColumn) {
      addUndoAction({
        id: result.removedColumn.id,
        type: "column",
        name: result.removedColumn.title,
        data: { boardId: resolvedBoardId, column: result.removedColumn },
      })
    }
    await loadBoardData()
  }

  const handleColumnMove = async (columnId: string, newOrder: number) => {
    const orderedColumnIds = columns.map((column) => column.id)
    const currentIndex = orderedColumnIds.indexOf(columnId)
    if (currentIndex === -1) return
    orderedColumnIds.splice(currentIndex, 1)
    orderedColumnIds.splice(newOrder, 0, columnId)
    await DBService.updateColumnOrder(resolvedBoardId, orderedColumnIds)
    await loadBoardData()
  }

  const handleTaskAdd = async (taskData: Partial<Task>, columnId: string) => {
    const newTask = await DBService.addTask(resolvedBoardId, columnId, {
      title: taskData.title || "Untitled",
      description: taskData.description || "",
      labels: taskData.labels || [],
    })
    if (newTask) {
      setTasks((prev) => [...prev, { ...newTask, columnId, boardId: resolvedBoardId }])
    }
  }

  const handleTaskUpdate = async (task: Task) => {
    if (!task.id || !task.columnId) {
      await loadBoardData()
      return
    }
    await DBService.updateTask(resolvedBoardId, task.columnId, task.id, {
      title: task.title,
      description: task.description,
      labels: task.labels,
    })
    setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, ...task } : item)))
  }

  const handleTaskDelete = async (taskId: string, columnId: string) => {
    const result = await DBService.deleteTask(resolvedBoardId, columnId, taskId)
    if (result.success && result.removedTask) {
      addUndoAction({
        id: result.removedTask.id,
        type: "task",
        name: result.removedTask.title,
        data: { boardId: resolvedBoardId, columnId, task: result.removedTask },
      })
    }
    setTasks((prev) => prev.filter((task) => task.id !== taskId))
  }

  const handleTaskMove = async (
    taskId: string,
    destinationColumnId: string,
    newPosition: number,
    sourceColumnId: string,
  ) => {
    await DBService.moveTask(resolvedBoardId, sourceColumnId, taskId, destinationColumnId, newPosition)
    await loadBoardData()
  }

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a0b2e] text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#1a0b2e] text-white">
        <h1 className="text-2xl font-bold mb-4">Board not found.</h1>
        <Button onClick={() => router.push("/boards")}>Go back to boards</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#1a0b2e] text-white">
      <header className="flex items-center justify-between p-4 border-b border-white/10 bg-[#1a0b2e]">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-pink-300">James ↔ Orca</p>
          <h1 className="text-xl font-semibold truncate" title={board.title}>
            {board.title}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
            <Link href="/boards">All boards</Link>
          </Button>
          <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => void logout()}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <KanbanBoardComponent
          boardId={resolvedBoardId}
          columns={columns}
          tasks={tasks}
          onColumnAdd={(title) => void handleColumnAdd(title)}
          onColumnUpdate={(columnId, title) => void handleColumnUpdate(columnId, title)}
          onColumnDelete={(columnId) => void handleColumnDelete(columnId)}
          onColumnMove={(columnId, order) => void handleColumnMove(columnId, order)}
          onTaskAdd={(taskData, columnId) => void handleTaskAdd(taskData, columnId)}
          onTaskUpdate={(task) => void handleTaskUpdate(task)}
          onTaskDelete={(taskId, columnId) => void handleTaskDelete(taskId, columnId)}
          onTaskMove={(taskId, dest, pos, src) => void handleTaskMove(taskId, dest, pos, src)}
        />
      </div>
    </div>
  )
}
