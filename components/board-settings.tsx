"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { getBoard, updateBoardTitle, deleteBoard } from "@/lib/db-service"
import { useRouter } from "next/navigation"

type BoardSettingsProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
}

export default function BoardSettings({ open, onOpenChange, boardId }: BoardSettingsProps) {
  const [boardName, setBoardName] = useState("")
  const [theme, setTheme] = useState("default")
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (open) {
      loadBoardData()
    }
  }, [open, boardId])

  const loadBoardData = async () => {
    try {
      const board = await getBoard(boardId)
      setBoardName(board.title)
      // In a real app, you would load the theme from the board data
    } catch (error) {
      console.error("Error loading board data:", error)
    }
  }

  const handleSaveSettings = async () => {
    if (!boardName.trim()) return

    setIsLoading(true)
    try {
      await updateBoardTitle(boardId, boardName)

      // In a real app, you would also save the theme
      // await updateBoardTheme(boardId, theme)

      setIsLoading(false)
      onOpenChange(false)

      toast({
        title: "Settings saved",
        description: "Your board settings have been updated.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  const handleDeleteBoard = async () => {
    if (!confirm("Are you sure you want to delete this board? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteBoard(boardId)

      toast({
        title: "Board deleted",
        description: "The board has been permanently deleted.",
      })

      onOpenChange(false)
      router.push("/boards")
    } catch (error) {
      console.error("Error deleting board:", error)
      toast({
        title: "Error",
        description: "Failed to delete board. Please try again.",
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Board Settings</DialogTitle>
          <DialogDescription>Customize your board appearance and behavior.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="board-name">Board Name</Label>
            <Input
              id="board-name"
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label>Theme</Label>
            <RadioGroup value={theme} onValueChange={setTheme}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="default" disabled={isLoading} />
                <Label htmlFor="default">Default</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dark" id="dark" disabled={isLoading} />
                <Label htmlFor="dark">Dark</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="colorful" id="colorful" disabled={isLoading} />
                <Label htmlFor="colorful">Colorful</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="pt-4">
            <Button
              variant="destructive"
              onClick={handleDeleteBoard}
              disabled={isDeleting || isLoading}
              className="w-full"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Board"
              )}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSaveSettings} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
