"use client"

import type React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

// For demo purposes, we'll use placeholder images
const placeholderStickers = [
  { id: "sticker-1", url: "/placeholder.svg?height=40&width=40" },
  { id: "sticker-2", url: "/placeholder.svg?height=40&width=40" },
  { id: "sticker-3", url: "/placeholder.svg?height=40&width=40" },
  { id: "sticker-4", url: "/placeholder.svg?height=40&width=40" },
  { id: "sticker-5", url: "/placeholder.svg?height=40&width=40" },
  { id: "sticker-6", url: "/placeholder.svg?height=40&width=40" },
]

type StickerModalProps = {
  open?: boolean
  onClose?: () => void
  onSelectSticker?: (stickerId: string, url: string) => void
}

export const StickerModal: React.FC<StickerModalProps> = ({
  open = false,
  onClose = () => {},
  onSelectSticker = () => {},
}) => {
  const handleSelectSticker = (stickerId: string, url: string) => {
    onSelectSticker(stickerId, url)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose a Sticker</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-4 p-4">
          {placeholderStickers.map((sticker) => (
            <Button
              key={sticker.id}
              variant="ghost"
              className="p-2 h-auto flex items-center justify-center hover:bg-accent"
              onClick={() => handleSelectSticker(sticker.id, sticker.url)}
            >
              <img src={sticker.url || "/placeholder.svg"} alt="Sticker" className="w-10 h-10" />
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
