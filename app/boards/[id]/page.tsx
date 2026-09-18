"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
import {
  hydrateOpsApiBoard,
  isOpsBoardRoute,
  pickBoardWithTasks,
  shouldPreferOpsJsonApi,
  type OpsApiBoardPayload,
  type OpsBoardDiagnostics,
} from "@/lib/ops-board"
import { completedAtForColumnMove, placeTaskBefore } from "@/lib/kanban-dnd"
import { filterTasksByProject, type ProjectFilterValue } from "@/lib/projects"
import { Button } from "@/components/ui/button"
import { ProjectFilter, ProjectLegend } from "@/components/project-chip"
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
  const [diagnostics, setDiagnostics] = useState<OpsBoardDiagnostics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [projectFilter, setProjectFilter] = useState<ProjectFilterValue>("all")

  const applyBoard = useCallback((boardData: Board) => {
    setBoard(boardData)
    setColumns(boardData.columns || [])
    setTasks(extractTasksFromBoard(boardData))
  }, [])

  const fetchOpsJsonBoard = useCallback(async () => {
    const response = await fetch("/api/ops/board", { cache: "no-store", credentials: "same-origin" })
    if (!response.ok) return { board: null, diagnostics: null }
    const payload = (await response.json()) as OpsApiBoardPayload
    if (payload.diagnostics) setDiagnostics(payload.diagnostics)
    if (!payload.board) return { board: null, diagnostics: payload.diagnostics ?? null }
    return { board: hydrateOpsApiBoard(payload.board), diagnostics: payload.diagnostics ?? null }
  }, [])

  const loadBoardData = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) setIsLoading(true)
      let apiBoard: Board | null = null
      let serverBoard: Board | null = null

      // JSON first for /boards/ops — Next server-action Flight still drops nested + flat task arrays.
      if (shouldPreferOpsJsonApi(boardId)) {
        const json = await fetchOpsJsonBoard()
        apiBoard = json.board
      }

      const apiHasTasks = apiBoard ? extractTasksFromBoard(apiBoard).length > 0 : false
      if (!apiHasTasks) {
        serverBoard = await DBService.getBoard(boardId)
        if (!apiBoard && shouldPreferOpsJsonApi(boardId, serverBoard.slug)) {
          const json = await fetchOpsJsonBoard()
          apiBoard = json.board
        }
      }

      const picked = pickBoardWithTasks(apiBoard, serverBoard)
      if (!picked.board) {
        throw new Error("Board not found")
      }

      applyBoard(picked.board)
      clearUndoAction()
      if (picked.board.slug === "ops" && boardId !== "ops" && boardId !== picked.board.id) {
        router.replace(`/boards/${picked.board.id}`)
      }
    } catch (error) {
      console.error("Error fetching board:", error)
      toast({ title: "Error", description: "Failed to load board data.", variant: "destructive" })
      router.push("/boards")
    } finally {
      if (!options?.silent) setIsLoading(false)
    }
  }, [applyBoard, boardId, fetchOpsJsonBoard, router, clearUndoAction, toast])

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
    await loadBoardData({ silent: true })
  }

  const handleTaskAdd = async (taskData: Partial<Task>, columnId: string) => {
    const newTask = await DBService.addTask(resolvedBoardId, columnId, {
      title: taskData.title || "Untitled",
      description: taskData.description || "",
      brief: taskData.brief || "",
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
    try {
      await DBService.updateTask(resolvedBoardId, task.columnId, task.id, {
        title: task.title,
        description: task.description,
        brief: task.brief,
        labels: task.labels,
      })
      setTasks((prev) => prev.map((item) => (item.id === task.id ? { ...item, ...task } : item)))
    } catch (error) {
      console.error("Error updating task:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update task.",
        variant: "destructive",
      })
    }
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
    beforeTaskId: string | null,
    sourceColumnId: string,
  ) => {
    const previous = tasks
    const completedAt = completedAtForColumnMove({
      fromTitle: columns.find((column) => column.id === sourceColumnId)?.title,
      toTitle: columns.find((column) => column.id === destinationColumnId)?.title,
    })
    const next = placeTaskBefore(tasks, {
      taskId,
      destColumnId: destinationColumnId,
      beforeTaskId,
      completedAt,
    })
    if (next === previous) return

    setTasks(next)
    try {
      const destIndex = next
        .filter((task) => String(task.columnId) === destinationColumnId)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .findIndex((task) => task.id === taskId)
      await DBService.moveTask(
        resolvedBoardId,
        sourceColumnId,
        taskId,
        destinationColumnId,
        destIndex < 0 ? 0 : destIndex,
      )
    } catch (error) {
      console.error("Error moving task:", error)
      setTasks(previous)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move task.",
        variant: "destructive",
      })
    }
  }

  const visibleTasks = useMemo(
    () => (isOpsBoardRoute(boardId, board?.slug) ? filterTasksByProject(tasks, projectFilter) : tasks),
    [board?.slug, boardId, projectFilter, tasks],
  )

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
    <div className="flex flex-col h-screen overflow-hidden bg-[#1a0b2e] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#1a0b2e]">
        <div className="flex items-center justify-between gap-4 px-4 pt-4 pb-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-pink-300">James ↔ Orca</p>
            <h1 className="text-xl font-semibold truncate" title={board.title}>
              {board.title}
            </h1>
            {diagnostics ? (
              <p
                className={`text-[11px] mt-1 max-w-xl leading-snug ${diagnostics.taskCount === 0 ? "text-amber-300/90" : "text-white/40"}`}
                data-testid="ops-db-fingerprint"
              >
                {diagnostics.taskCount} cards · db {diagnostics.dbHostSuffix} / {diagnostics.dbName}
                {diagnostics.taskCount === 0
                  ? " — if you expected Helium cards, set Autoscale Publish Secrets DATABASE_URL to the workspace URI (host helium, db heliumdb). Do not create a second board."
                  : ""}
              </p>
            ) : null}
            {!isOpsBoardRoute(boardId, board.slug) ? <ProjectLegend className="mt-2" /> : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10" onClick={() => void logout()}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </Button>
          </div>
        </div>
        {isOpsBoardRoute(boardId, board.slug) ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 pb-3">
            <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">Project</span>
            <ProjectFilter value={projectFilter} onChange={setProjectFilter} />
            {projectFilter !== "all" ? (
              <p className="text-[11px] text-white/50" data-testid="project-filter-status">
                Showing {visibleTasks.length} of {tasks.length} cards
              </p>
            ) : null}
          </div>
        ) : null}
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">
        <KanbanBoardComponent
          boardId={resolvedBoardId}
          columns={columns}
          tasks={visibleTasks}
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
