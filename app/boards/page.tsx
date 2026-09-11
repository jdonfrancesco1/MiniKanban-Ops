"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Loader2, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBoard, ensureDefaultBoard, getUserBoards } from "@/lib/db-service"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

type BoardSummary = {
  id: string
  title: string
  updatedAt: string
  tasks: number
  slug?: string | null
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [newBoardTitle, setNewBoardTitle] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading, logout } = useAuth()

  useEffect(() => {
    if (loading) return
    if (!user) return

    const load = async () => {
      setIsLoadingBoards(true)
      try {
        const defaultBoard = await ensureDefaultBoard()
        const userBoards = await getUserBoards()
        setBoards(userBoards)
        if (userBoards.length <= 1) {
          router.replace(`/boards/${defaultBoard.slug || defaultBoard.id}`)
        }
      } catch (error) {
        console.error("Error loading boards:", error)
        toast({
          title: "Error",
          description: "Failed to load boards. Is DATABASE_URL set?",
          variant: "destructive",
        })
      } finally {
        setIsLoadingBoards(false)
      }
    }

    void load()
  }, [user, loading, router, toast])

  const handleCreateBoard = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newBoardTitle.trim()) return

    setIsLoading(true)
    try {
      const newBoard = await createBoard(newBoardTitle)
      setBoards([newBoard, ...boards])
      setNewBoardTitle("")
      setIsDialogOpen(false)
      router.push(`/boards/${newBoard.id}`)
    } catch (error) {
      console.error("Error creating board:", error)
      toast({
        title: "Error",
        description: "Failed to create board. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoadingBoards) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a0b2e] text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#1a0b2e] text-white">
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#1a0b2e]/95">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="font-bold text-xl">
            MiniKanban Ops
          </Link>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-pink-500 hover:bg-pink-600">
                  <Plus className="mr-2 h-4 w-4" /> New Board
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateBoard}>
                  <DialogHeader>
                    <DialogTitle>Create New Board</DialogTitle>
                    <DialogDescription>New boards get the ops columns: Need you, I&apos;m on, Waiting, Done.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Board Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Launch week"
                        value={newBoardTitle}
                        onChange={(event) => setNewBoardTitle(event.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Creating..." : "Create Board"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" className="text-white/70" onClick={() => void logout()}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Boards</h1>
          <p className="text-white/60">Single-user ops workspace. Home board is Ops.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <Link href={`/boards/${board.slug || board.id}`} key={board.id} className="block">
              <Card className="h-full bg-[#2a1b3e] border-white/10 text-white hover:border-pink-400/40">
                <CardHeader>
                  <CardTitle>{board.title}</CardTitle>
                  <CardDescription className="text-white/50">
                    {board.slug === "ops" ? "Default ops board" : "Updated"} {new Date(board.updatedAt).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{board.tasks} tasks</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
