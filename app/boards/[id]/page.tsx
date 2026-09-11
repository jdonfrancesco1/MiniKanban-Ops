"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import KanbanBoardComponent, { type Task } from "@/components/kanban-board" // Renamed to avoid conflict
import type { PlacedSticker } from "@/components/sticker-layer" // Assuming this is for board stickers
import { useUndoContext } from "@/contexts/undo-context"
import { useAuthContext } from "@/contexts/auth-context"
import { DBService, extractTasksFromBoard, type Board, type Column } from "@/lib/db-service"
import { useMobile } from "@/hooks/use-mobile"
import BoardAbout from "@/components/board-about"
import BoardChat from "@/components/board-chat"
import BoardSettings from "@/components/board-settings"
import ShareBoard from "@/components/share-board"
import StickerButton from "@/components/sticker-button"
import { Button } from "@/components/ui/button"
import { Loader2, InfoIcon } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface BoardPageProps {
  params: {
    id: string
  }
}

export default function BoardPage({ params }: BoardPageProps) {
  const { id: boardId } = params
  const router = useRouter()
  const { user, loading: authLoading } = useAuthContext()
  const { isMobile } = useMobile()
  const { resetUndoHistory, addUndoAction } = useUndoContext()
  const { toast } = useToast()

  const [board, setBoard] = useState<Board | null>(null)
  const [columns, setColumns] = useState<Column[]>([])
  const [tasks, setTasks] = useState<Task[]>([]) // All tasks for the board
  const [boardStickers, setBoardStickers] = useState<PlacedSticker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [activeSheet, setActiveSheet] = useState<string | null>(null)

  const loadBoardData = useCallback(async () => {
    try {
      setIsLoading(true)
      const boardData = await DBService.getBoard(boardId)
      if (!boardData) {
        toast({ title: "Error", description: "Board not found.", variant: "destructive" })
        router.push("/boards")
        return
      }

      setBoard(boardData)
      setColumns(boardData.columns || [])
      setTasks(extractTasksFromBoard(boardData))
      setBoardStickers(boardData.stickers || [])
      setIsOwner(user?.uid === boardData.createdBy) // Assuming createdBy is ownerId

      resetUndoHistory()
    } catch (error) {
      console.error("Error fetching board:", error)
      toast({ title: "Error", description: "Failed to load board data.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [boardId, user, router, resetUndoHistory, toast])

  useEffect(() => {
    if (!authLoading && user) {
      loadBoardData()
    } else if (!authLoading && !user) {
      router.push("/auth") // Redirect if not authenticated
    }
  }, [authLoading, user, loadBoardData, router])

  // Board operations
  const handleBoardDetailsUpdate = async (title: string, description?: string) => {
    if (!board) return
    try {
      await DBService.updateBoardTitle(boardId, title)
      if (description !== undefined) {
        await DBService.updateBoardDescription(boardId, description)
      }
      setBoard((prev) => (prev ? { ...prev, title, description: description ?? prev.description } : null))
      toast({ title: "Board updated" })
    } catch (error) {
      console.error("Error updating board details:", error)
      toast({ title: "Error", description: "Failed to update board details.", variant: "destructive" })
    }
  }

  // Column operations
  const handleColumnAdd = async (title: string) => {
    try {
      const newColumn = await DBService.addColumn(boardId, title)
      if (newColumn) {
        setColumns((prev) => [...prev, newColumn])
        // Reload board to get full state, or update locally carefully
        loadBoardData()
      }
    } catch (error) {
      console.error("Error adding column:", error)
      toast({ title: "Error", description: "Failed to add column.", variant: "destructive" })
    }
  }

  const handleColumnUpdate = async (columnId: string, newTitle: string) => {
    try {
      await DBService.updateColumnTitle(boardId, columnId, newTitle)
      setColumns((prev) => prev.map((c) => (c.id === columnId ? { ...c, title: newTitle } : c)))
    } catch (error) {
      console.error("Error updating column:", error)
      toast({ title: "Error", description: "Failed to update column.", variant: "destructive" })
    }
  }

  const handleColumnDelete = async (columnId: string) => {
    try {
      const result = await DBService.deleteColumn(boardId, columnId)
      if (result.success && result.removedColumn) {
        addUndoAction({
          id: result.removedColumn.id,
          type: "column",
          name: result.removedColumn.title,
          data: { boardId, column: result.removedColumn },
        })
      }
      // Optimistically update UI or reload
      loadBoardData()
      toast({ title: "Column deleted" })
    } catch (error) {
      console.error("Error deleting column:", error)
      toast({ title: "Error", description: "Failed to delete column.", variant: "destructive" })
    }
  }

  const handleColumnMove = async (columnId: string, newOrder: number) => {
    // This requires DBService.updateColumnOrder and careful state management
    // For now, let's assume it reorders and calls loadBoardData or updates locally
    const orderedColumnIds = columns.map((c) => c.id)
    const currentIndex = orderedColumnIds.indexOf(columnId)
    if (currentIndex === -1) return
    orderedColumnIds.splice(currentIndex, 1)
    orderedColumnIds.splice(newOrder, 0, columnId)
    try {
      await DBService.updateColumnOrder(boardId, orderedColumnIds)
      loadBoardData() // Reload to reflect new order
    } catch (error) {
      console.error("Error moving column:", error)
      toast({ title: "Error", description: "Failed to move column.", variant: "destructive" })
    }
  }

  // Task operations
  const handleTaskAdd = async (
    taskData: Omit<Task, "id" | "createdAt" | "updatedAt" | "createdBy">,
    columnId: string,
  ) => {
    try {
      const newTask = await DBService.addTask(boardId, columnId, taskData)
      if (newTask) {
        setTasks((prev) => [...prev, { ...newTask, columnId, boardId }])
        // Or reload: loadBoardData();
      }
    } catch (error) {
      console.error("Error adding task:", error)
      toast({ title: "Error", description: "Failed to add task.", variant: "destructive" })
    }
  }

  const handleTaskUpdate = async (
    columnId: string,
    taskId: string,
    updates: Partial<Omit<Task, "id" | "createdAt" | "createdBy">>,
  ) => {
    try {
      await DBService.updateTask(boardId, columnId, taskId, updates)
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)))
    } catch (error) {
      console.error("Error updating task:", error)
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" })
    }
  }

  const handleTaskDelete = async (columnId: string, taskId: string) => {
    try {
      const result = await DBService.deleteTask(boardId, columnId, taskId)
      if (result.success && result.removedTask) {
        addUndoAction({
          id: result.removedTask.id,
          type: "task",
          name: result.removedTask.title,
          data: { boardId, columnId, task: result.removedTask },
        })
      }
      setTasks((prev) => prev.filter((t) => t.id !== taskId))
      // Or reload: loadBoardData();
      toast({ title: "Task deleted" })
    } catch (error) {
      console.error("Error deleting task:", error)
      toast({ title: "Error", description: "Failed to delete task.", variant: "destructive" })
    }
  }

  const handleTaskMove = async (
    taskId: string,
    sourceColumnId: string,
    destinationColumnId: string,
    newPosition: number,
  ) => {
    try {
      await DBService.moveTask(boardId, sourceColumnId, taskId, destinationColumnId, newPosition)
      // Optimistically update or reload
      loadBoardData()
    } catch (error) {
      console.error("Error moving task:", error)
      toast({ title: "Error", description: "Failed to move task.", variant: "destructive" })
    }
  }

  // Board Sticker operations
  const handleBoardStickerAdd = async (sticker: Omit<PlacedSticker, "id">) => {
    try {
      const result = await DBService.addBoardSticker(boardId, sticker)
      if (result.success && result.stickerId) {
        setBoardStickers((prev) => [...prev, { ...sticker, id: result.stickerId! }])
      }
    } catch (error) {
      console.error("Error adding board sticker:", error)
      toast({ title: "Error", description: "Failed to add sticker to board.", variant: "destructive" })
    }
  }

  const handleBoardStickerMove = async (stickerId: string, position: { x: number; y: number }) => {
    try {
      await DBService.updateBoardStickerPosition(boardId, stickerId, position)
      setBoardStickers((prev) => prev.map((s) => (s.id === stickerId ? { ...s, position } : s)))
    } catch (error) {
      console.error("Error moving board sticker:", error)
      toast({ title: "Error", description: "Failed to move sticker on board.", variant: "destructive" })
    }
  }

  const handleBoardStickerRemove = async (stickerId: string) => {
    try {
      await DBService.removeBoardSticker(boardId, stickerId)
      setBoardStickers((prev) => prev.filter((s) => s.id !== stickerId))
    } catch (error) {
      console.error("Error removing board sticker:", error)
      toast({ title: "Error", description: "Failed to remove sticker from board.", variant: "destructive" })
    }
  }

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  if (!board) {
    // Already handled by loadBoardData redirect/toast, but as a fallback:
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Board not found or access denied.</h1>
        <Button onClick={() => router.push("/boards")}>Go back to boards</Button>
      </div>
    )
  }

  // Props for KanbanBoardComponent might need adjustment based on its actual definition
  // e.g. onTaskAdd might need to pass columnId, onColumnUpdate might just pass (id, newTitle)
  // This is a simplified mapping.

  return (
    <div className="flex flex-col h-screen bg-muted/40">
      <header className="flex items-center justify-between p-4 border-b bg-background shadow-sm">
        <h1 className="text-xl font-semibold truncate" title={board.title}>
          {board.title}
        </h1>
        <div className="flex items-center gap-2">
          <StickerButton
            onStickerSelect={(sticker) =>
              handleBoardStickerAdd({
                stickerId: sticker.id,
                url: sticker.url,
                position: { x: 10, y: 10 },
                color: sticker.color,
              })
            }
          />
          <Sheet open={activeSheet !== null} onOpenChange={(isOpen) => !isOpen && setActiveSheet(null)}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" onClick={() => setActiveSheet(activeSheet ? null : "menu")}>
                <InfoIcon className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md p-0">
              <Tabs defaultValue="about" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-4 rounded-none border-b">
                  <TabsTrigger value="about" onClick={() => setActiveSheet("about")}>
                    About
                  </TabsTrigger>
                  <TabsTrigger value="chat" onClick={() => setActiveSheet("chat")}>
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="share" onClick={() => setActiveSheet("share")}>
                    Share
                  </TabsTrigger>
                  {isOwner && (
                    <TabsTrigger value="settings" onClick={() => setActiveSheet("settings")}>
                      Settings
                    </TabsTrigger>
                  )}
                  {/* <TabsTrigger value="audio" onClick={() => setActiveSheet('audio')}>Audio</TabsTrigger> */}
                </TabsList>
                <div className="flex-1 overflow-y-auto p-6">
                  <TabsContent value="about" className={activeSheet === "about" ? "" : "hidden"}>
                    <BoardAbout
                      boardId={boardId}
                      initialDescription={board.description || ""}
                      onSave={(desc) => handleBoardDetailsUpdate(board.title, desc)}
                    />
                  </TabsContent>
                  <TabsContent value="chat" className={activeSheet === "chat" ? "" : "hidden"}>
                    <BoardChat boardId={boardId} />
                  </TabsContent>
                  <TabsContent value="share" className={activeSheet === "share" ? "" : "hidden"}>
                    <ShareBoard boardId={boardId} />
                  </TabsContent>
                  {isOwner && (
                    <TabsContent value="settings" className={activeSheet === "settings" ? "" : "hidden"}>
                      <BoardSettings boardId={boardId} />
                    </TabsContent>
                  )}
                  {/* Audio recordings can be added back if needed
                  <TabsContent value="audio" className={activeSheet === 'audio' ? '' : 'hidden'}>
                    <BoardAudioRecordings boardId={boardId} />
                  </TabsContent>
                  */}
                </div>
              </Tabs>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <KanbanBoardComponent
          boardId={boardId}
          columns={columns}
          tasks={tasks} // Pass all tasks
          boardStickers={boardStickers} // Pass board-level stickers
          onColumnAdd={handleColumnAdd}
          onColumnUpdate={handleColumnUpdate} // (columnId, newTitle)
          onColumnDelete={handleColumnDelete}
          onColumnMove={handleColumnMove} // (columnId, newOrder)
          onTaskAdd={handleTaskAdd} // (taskData, columnId)
          onTaskUpdate={handleTaskUpdate} // (columnId, taskId, updates)
          onTaskDelete={handleTaskDelete} // (columnId, taskId)
          onTaskMove={handleTaskMove} // (taskId, srcColId, destColId, newPos)
          onBoardStickerAdd={handleBoardStickerAdd}
          onBoardStickerMove={handleBoardStickerMove}
          onBoardStickerRemove={handleBoardStickerRemove}
          // Task sticker handlers need to be wired up if KanbanTask supports them directly
          // onTaskStickerAdd, onTaskStickerMove, onTaskStickerRemove
        />
      </div>
    </div>
  )
}
