"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Plus, Share2, Loader2, FileText, PlusCircle } from "lucide-react"
import { createBoard, getUserBoards } from "@/lib/db-service"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

type BoardSummary = {
  id: string
  title: string
  updatedAt: string
  tasks: number
  shared?: boolean
}

export default function BoardsPage() {
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [newBoardTitle, setNewBoardTitle] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(true) // Default to showing onboarding
  const router = useRouter()
  const { toast } = useToast()
  const { user, loading } = useAuth()

  // Check if this is the first login
  const isFirstLogin = () => {
    const firstLoginKey = `minikanban-first-login-${user?.uid || "guest"}`
    const hasLoggedInBefore = localStorage.getItem(firstLoginKey)

    if (!hasLoggedInBefore && user) {
      // Set the flag to indicate user has logged in before
      localStorage.setItem(firstLoginKey, "true")
      return true
    }

    return false
  }

  useEffect(() => {
    // Redirect to auth if not logged in
    if (!loading && !user) {
      router.push("/auth")
      return
    }

    // Load boards if user is logged in
    if (user) {
      loadBoards()
    }
  }, [user, loading, router])

  const loadBoards = async () => {
    setIsLoadingBoards(true)
    try {
      const userBoards = await getUserBoards()
      setBoards(userBoards)

      // Show onboarding if there are no boards or if it's the first login
      // or if forced by query param
      const shouldShowOnboarding =
        userBoards.length === 0 || isFirstLogin() || window.location.search.includes("onboarding=true")

      setShowOnboarding(shouldShowOnboarding)
    } catch (error) {
      console.error("Error loading boards:", error)
      toast({
        title: "Error",
        description: "Failed to load boards. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingBoards(false)
    }
  }

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault()
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

  const createExampleBoard = async () => {
    setIsLoading(true)
    try {
      const exampleBoard = await createBoard("Project Planning", true) // Pass true to use the project planning template
      setBoards([exampleBoard, ...boards])
      router.push(`/boards/${exampleBoard.id}`)
    } catch (error) {
      console.error("Error creating example board:", error)
      toast({
        title: "Error",
        description: "Failed to create example board. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl">MiniKanban</span>
          </Link>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> New Board
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateBoard}>
                  <DialogHeader>
                    <DialogTitle>Create New Board</DialogTitle>
                    <DialogDescription>Give your board a name to get started.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Board Name</Label>
                      <Input
                        id="name"
                        placeholder="e.g., Project Planning"
                        value={newBoardTitle}
                        onChange={(e) => setNewBoardTitle(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Board"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Your Boards</h1>
          <p className="text-muted-foreground">Create and manage your Kanban boards</p>
        </div>

        {isLoadingBoards ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {showOnboarding ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-medium mb-2">Welcome to MiniKanban!</h2>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Get started by creating your first board or try our example project
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
                  <Card className="bg-background/80 backdrop-blur border border-muted/30 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <PlusCircle className="h-5 w-5 mr-2" />
                        Create New Board
                      </CardTitle>
                      <CardDescription>Start with a blank board and customize it</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">
                        Create columns, add tasks, and organize your workflow exactly how you want it.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" onClick={() => setIsDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Create New Board
                      </Button>
                    </CardFooter>
                  </Card>

                  <Card className="bg-background/80 backdrop-blur border border-muted/30 shadow-lg hover:shadow-xl transition-all">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Start with Example
                      </CardTitle>
                      <CardDescription>Use our pre-configured project planning template</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="aspect-video rounded-md overflow-hidden mb-4 bg-purple-950/50 border border-purple-800/30">
                        <img
                          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-gqCaS3whhdz7c0oPCQSyKYpHY1jU5S.png"
                          alt="Project Planning Template"
                          className="w-full h-full object-cover opacity-90"
                        />
                      </div>
                      <p className="text-sm">
                        Get started quickly with our project planning template that includes sample tasks and columns.
                      </p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" className="w-full" onClick={createExampleBoard} disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>Use Project Planning Template</>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                </div>

                {boards.length > 0 && (
                  <div className="mt-8">
                    <Button variant="link" onClick={() => setShowOnboarding(false)}>
                      View my existing boards
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {boards.map((board) => (
                    <Link href={`/boards/${board.id}`} key={board.id} className="block">
                      <Card className="h-full transition-all hover:shadow-md">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <CardTitle>{board.title}</CardTitle>
                            {board.shared && (
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                                Shared
                              </span>
                            )}
                          </div>
                          <CardDescription>Last updated: {formatDate(board.updatedAt)}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p>{board.tasks} tasks</p>
                        </CardContent>
                        <CardFooter>
                          <Button variant="ghost" size="sm" className="ml-auto">
                            <Share2 className="mr-2 h-4 w-4" /> Share
                          </Button>
                        </CardFooter>
                      </Card>
                    </Link>
                  ))}
                </div>

                {boards.length === 0 && (
                  <div className="text-center py-12">
                    <h2 className="text-xl font-medium mb-2">No boards yet</h2>
                    <p className="text-muted-foreground mb-6">Create your first board to get started</p>
                    <Button onClick={() => setIsDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" /> Create Board
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
