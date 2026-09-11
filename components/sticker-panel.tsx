"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  taskStatusStickers,
  motivationStickers,
  teamStickers,
  businessStickers,
  additionalBusinessStickers,
  type Sticker,
} from "@/lib/sticker-data"

export type StickerItem = Sticker

type StickerPanelProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStickerSelect: (sticker: StickerItem) => void
  isPremium?: boolean
}

export function StickerPanel({ open, onOpenChange, onStickerSelect, isPremium = false }: StickerPanelProps) {
  const [activeTab, setActiveTab] = useState("task-status")

  const handleStickerClick = (sticker: StickerItem) => {
    if (!isPremium && !sticker.isFree) return
    onStickerSelect(sticker)
    onOpenChange(false)
  }

  const handleDragStart = (e: React.DragEvent, sticker: StickerItem) => {
    if (!isPremium && !sticker.isFree) {
      e.preventDefault()
      return
    }

    e.dataTransfer.setData("application/json", JSON.stringify(sticker))
    e.dataTransfer.effectAllowed = "copy"

    // Create a custom drag image with transparent background
    const dragImage = new Image()
    dragImage.src = sticker.url
    dragImage.width = 40
    dragImage.height = 40
    document.body.appendChild(dragImage)
    e.dataTransfer.setDragImage(dragImage, 20, 20)

    setTimeout(() => {
      document.body.removeChild(dragImage)
    }, 0)
  }

  // Get stickers based on active tab
  const getStickersForTab = () => {
    switch (activeTab) {
      case "task-status":
        return taskStatusStickers
      case "motivation":
        return motivationStickers
      case "team":
        return teamStickers
      case "business":
        return [...businessStickers, ...additionalBusinessStickers]
      default:
        return taskStatusStickers
    }
  }

  const stickers = getStickersForTab()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Add Stickers</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="task-status" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="task-status">Task Status</TabsTrigger>
            <TabsTrigger value="motivation">Motivation</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <ScrollArea className="h-[300px]">
              <div className="grid grid-cols-4 gap-4 p-2">
                {stickers.map((sticker) => (
                  <div
                    key={sticker.id}
                    className={`
                      flex flex-col items-center gap-2 p-2 rounded-lg
                      ${!isPremium && !sticker.isFree ? "opacity-60" : "hover:bg-primary/10 cursor-pointer"}
                    `}
                    onClick={() => handleStickerClick(sticker)}
                    draggable={isPremium || sticker.isFree}
                    onDragStart={(e) => handleDragStart(e, sticker)}
                  >
                    <div
                      className="h-16 w-16 flex items-center justify-center rounded-full"
                      style={{ backgroundColor: sticker.color }}
                    >
                      <img
                        src={sticker.url || "/placeholder.svg"}
                        alt={sticker.name}
                        className="h-10 w-10 object-contain"
                        draggable="false"
                      />
                    </div>
                    <span className="text-xs text-center">{sticker.name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {activeTab === "business" && !isPremium && (
              <div className="mt-4 p-3 bg-muted rounded-md text-sm text-muted-foreground">
                <p>Premium stickers are available with a premium subscription.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
