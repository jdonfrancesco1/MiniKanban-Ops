"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Loader2 } from "lucide-react"
import { KanbanBoard } from "@/components/kanban-board"
import { BoardChat } from "@/components/board-chat"
import { useToast } from "@/hooks/use-toast"
import { getBoard, subscribeToBoard, type Board } from "@/lib/db-service"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

export default function SharedBoardPage({ params }: { params: { id: string } }) {
  const [board, setBoard] = useState<Board | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Load board even if user is not logged in (for shared boards)
    loadBoard()
  }, [params.id])

  const loadBoard = async () => {
    setIsLoading(true)
    try {
      // Get initial board data
      const boardData = await getBoard(params.id)
      setBoard(boardData)

      // Subscribe to real-time updates
      const unsubscribe = subscribeToBoard(params.id, (updatedBoard) => {
        setBoard(updatedBoard)
      })

      // Cleanup subscription on unmount
      return () => unsubscribe()
    } catch (error) {
      console.error("Error loading board:", error)
      toast({
        title: "Error",
        description: "Failed to load board. The link may be invalid or the board has been deleted.",
        variant: "destructive",
      })
      router.push("/")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Board not found</h1>
        <Button asChild>
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="font-bold text-xl">{board.title}</h1>
            {!user && (
              <div className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded">View Only</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!user && (
              <Button asChild>
                <Link href="/auth">Sign In to Edit</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6 overflow-x-auto">
        {board && <KanbanBoard boardId={params.id} columns={board.columns} />}
      </main>

      {user && <BoardChat boardId={params.id} />}
    </div>
  )
}
