"use client"

import type React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

export type StickerPosition = {
  x: number
  y: number
}

export type PlacedSticker = {
  id: string
  stickerId: string
  url: string
  position: StickerPosition
  color?: string
}

type StickerLayerProps = {
  stickers: PlacedSticker[]
  onStickerMove?: (sticker: PlacedSticker) => void
  onStickerRemove?: (stickerId: string) => void
  containerClassName?: string
}

export function StickerLayer({ stickers, onStickerMove, onStickerRemove, containerClassName }: StickerLayerProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [draggedStickerId, setDraggedStickerId] = useState<string | null>(null)

  const handleMouseDown = (e: React.MouseEvent, stickerId: string) => {
    e.stopPropagation()
    setIsDragging(true)
    setDraggedStickerId(stickerId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedStickerId || !onStickerMove) return

    const target = e.currentTarget
    const rect = target.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    const sticker = stickers.find((s) => s.id === draggedStickerId)
    if (sticker) {
      onStickerMove({
        ...sticker,
        position: { x, y },
      })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setDraggedStickerId(null)
  }

  const handleRemove = (e: React.MouseEvent, stickerId: string) => {
    e.stopPropagation()
    if (onStickerRemove) {
      onStickerRemove(stickerId)
    }
  }

  return (
    <div
      className={cn("absolute inset-0 w-full h-full", containerClassName)}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchMove={(e) => {
        if (!isDragging || !draggedStickerId || !onStickerMove) return

        const touch = e.touches[0]
        const target = e.currentTarget
        const rect = target.getBoundingClientRect()
        const x = ((touch.clientX - rect.left) / rect.width) * 100
        const y = ((touch.clientY - rect.top) / rect.height) * 100

        const sticker = stickers.find((s) => s.id === draggedStickerId)
        if (sticker) {
          onStickerMove({
            ...sticker,
            position: { x, y },
          })
        }
      }}
      onTouchEnd={handleMouseUp}
    >
      {stickers.map((sticker) => (
        <div
          key={sticker.id}
          className="absolute cursor-move group z-10 sticker-item"
          style={{
            left: `${sticker.position.x}%`,
            top: `${sticker.position.y}%`,
            transform: "translate(-50%, -50%)",
          }}
          onMouseDown={(e) => handleMouseDown(e, sticker.id)}
          onTouchStart={(e) => {
            e.stopPropagation()
            setIsDragging(true)
            setDraggedStickerId(sticker.id)
          }}
        >
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              backgroundColor: sticker.color || "transparent",
              width: "40px",
              height: "40px",
            }}
          >
            <img
              src={sticker.url || "/placeholder.svg"}
              alt="Sticker"
              className="w-8 h-8 object-contain"
              draggable="false"
            />
          </div>
          <button
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => handleRemove(e, sticker.id)}
            aria-label="Remove sticker"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}

// Add default export that points to the named export
export default StickerLayer
