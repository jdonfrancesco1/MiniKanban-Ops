"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { getBoard, restoreTask, permanentlyDeleteTask, type Task } from "@/lib/db-service"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function ArchivedTasksPage() {
  const params = useParams()
  const router = useRouter()
  const boardId = params.id as string
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchArchivedTasks() {
      try {
        setLoading(true)
        const board = await getBoard(boardId)
        if (board && board.archivedTasks) {
          setArchivedTasks(board.archivedTasks)
        } else {
          setArchivedTasks([])
        }
      } catch (error) {
        console.error("Error fetching archived tasks:", error)
        toast({
          title: "Error",
          description: "Failed to load archived tasks",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchArchivedTasks()
  }, [boardId])

  const handleRestore = async (taskId: string) => {
    try {
      await restoreTask(boardId, taskId)
      setArchivedTasks(archivedTasks.filter((task) => task.id !== taskId))
      toast({
        title: "Task restored",
        description: "Task has been restored successfully",
      })
    } catch (error) {
      console.error("Error restoring task:", error)
      toast({
        title: "Error",
        description: "Failed to restore task",
        variant: "destructive",
      })
    }
  }

  const handlePermanentDelete = async (taskId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this task? This action cannot be undone.")) {
      try {
        await permanentlyDeleteTask(boardId, taskId)
        setArchivedTasks(archivedTasks.filter((task) => task.id !== taskId))
        toast({
          title: "Task deleted",
          description: "Task has been permanently deleted",
        })
      } catch (error) {
        console.error("Error deleting task:", error)
        toast({
          title: "Error",
          description: "Failed to delete task",
          variant: "destructive",
        })
      }
    }
  }

  // Function to check if a task has been archived for more than 30 days
  const isOlderThan30Days = (archivedAt?: number) => {
    if (!archivedAt) return false
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000
    return Date.now() - archivedAt > thirtyDaysInMs
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Link href={`/boards/${boardId}`} className="mr-4">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Archived Tasks</h1>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p>Loading archived tasks...</p>
        </div>
      ) : archivedTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground mb-4">No archived tasks found</p>
            <Link href={`/boards/${boardId}`}>
              <Button>Back to Board</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {archivedTasks.map((task) => (
            <Card key={task.id} className={isOlderThan30Days(task.archivedAt) ? "border-red-500/50" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Status: {task.status}</span>
                  <span>Archived: {task.archivedAt ? new Date(task.archivedAt).toLocaleDateString() : "Unknown"}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{task.description || "No description"}</p>

                {isOlderThan30Days(task.archivedAt) && (
                  <div className="bg-red-500/10 text-red-400 p-2 rounded-md mb-4 text-xs">
                    This task was archived more than 30 days ago and is eligible for permanent deletion.
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(task.id)}
                    className="flex items-center"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handlePermanentDelete(task.id)}
                    className="flex items-center"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
