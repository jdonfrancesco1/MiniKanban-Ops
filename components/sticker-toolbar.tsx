"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  taskStatusStickers,
  motivationStickers,
  teamStickers,
  businessStickers,
  additionalBusinessStickers,
  type Sticker,
} from "@/lib/sticker-data"
import { Smile } from "lucide-react"

interface StickerToolbarProps {
  onStickerSelect: (sticker: Sticker) => void
  isPremium?: boolean
  variant?: "outline" | "floating"
  size?: "sm" | "md" | "lg"
  className?: string
}

export function StickerToolbar({
  onStickerSelect,
  isPremium = false,
  variant = "outline",
  size = "md",
  className = "",
}: StickerToolbarProps) {
  const [activeTab, setActiveTab] = useState("task-status")

  const handleStickerClick = (sticker: Sticker) => {
    if (!isPremium && !sticker.isFree) return
    onStickerSelect(sticker)
  }

  const handleDragStart = (e: React.DragEvent, sticker: Sticker) => {
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

  if (variant === "floating") {
    return (
      <div className="sticker-floating-button" onClick={() => {}}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-full w-full rounded-full">
              <Smile className="h-6 w-6" />
              <span className="sr-only">Open sticker toolbar</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <Tabs defaultValue="task-status" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="task-status">Status</TabsTrigger>
                <TabsTrigger value="motivation">Motivation</TabsTrigger>
                <TabsTrigger value="team">Team</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="p-2">
                <div className="grid grid-cols-5 gap-2">
                  {stickers.map((sticker) => (
                    <div
                      key={sticker.id}
                      className={`
                        flex items-center justify-center p-1 rounded-full
                        ${!isPremium && !sticker.isFree ? "opacity-60" : "hover:bg-primary/10 cursor-pointer"}
                      `}
                      onClick={() => handleStickerClick(sticker)}
                      draggable={isPremium || sticker.isFree}
                      onDragStart={(e) => handleDragStart(e, sticker)}
                      style={{ backgroundColor: sticker.color }}
                    >
                      <img
                        src={sticker.url || "/placeholder.svg"}
                        alt={sticker.name}
                        className="h-8 w-8 object-contain"
                        draggable="false"
                      />
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size={size === "sm" ? "sm" : "default"} className={className}>
          <Smile className={size === "sm" ? "h-4 w-4 mr-1" : "h-5 w-5 mr-2"} />
          Stickers
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Tabs defaultValue="task-status" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="task-status">Status</TabsTrigger>
            <TabsTrigger value="motivation">Motivation</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="business">Business</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="p-2">
            <div className="grid grid-cols-5 gap-2">
              {stickers.map((sticker) => (
                <div
                  key={sticker.id}
                  className={`
                    flex items-center justify-center p-1 rounded-full
                    ${!isPremium && !sticker.isFree ? "opacity-60" : "hover:bg-primary/10 cursor-pointer"}
                  `}
                  onClick={() => handleStickerClick(sticker)}
                  draggable={isPremium || sticker.isFree}
                  onDragStart={(e) => handleDragStart(e, sticker)}
                  style={{ backgroundColor: sticker.color }}
                >
                  <img
                    src={sticker.url || "/placeholder.svg"}
                    alt={sticker.name}
                    className="h-8 w-8 object-contain"
                    draggable="false"
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
