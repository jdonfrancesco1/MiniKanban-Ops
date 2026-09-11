"use client"

import { useState } from "react"
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
import { Copy, Check, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { shareBoard } from "@/lib/db-service"

type ShareBoardProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  boardId: string
}

export default function ShareBoard({ open, onOpenChange, boardId }: ShareBoardProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  // Generate a shareable link
  const shareableLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/shared/${boardId}`
      : `https://example.com/shared/${boardId}`

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink)
    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)

    toast({
      title: "Link copied",
      description: "Shareable link copied to clipboard",
    })
  }

  const handleSendLink = async () => {
    if (!phoneNumber.trim()) return

    setIsSending(true)
    try {
      const result = await shareBoard(boardId, phoneNumber)

      setIsSending(false)
      setPhoneNumber("")

      toast({
        title: "Board shared",
        description: result.message || "Shareable link has been sent via SMS",
      })
    } catch (error) {
      console.error("Error sharing board:", error)
      toast({
        title: "Error",
        description: "Failed to share board. Please try again.",
        variant: "destructive",
      })
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Share Board</DialogTitle>
          <DialogDescription>Share this board with others to collaborate in real-time.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="link">Shareable Link</Label>
            <div className="flex items-center gap-2">
              <Input id="link" value={shareableLink} readOnly className="flex-1" />
              <Button size="icon" variant="outline" onClick={handleCopyLink} className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">Share via Phone Number</Label>
            <div className="flex items-center gap-2">
              <Input
                id="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSendLink} disabled={isSending || !phoneNumber.trim()} className="shrink-0">
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sharing...
                  </>
                ) : (
                  "Share"
                )}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
