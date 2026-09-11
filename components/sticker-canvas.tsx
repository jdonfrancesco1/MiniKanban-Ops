"use client"

import type React from "react"
import { useState } from "react"
import type { PlacedSticker, StickerPosition } from "@/lib/db-service"

type StickerCanvasProps = {
  stickers?: PlacedSticker[]
  onAddSticker?: (stickerId: string, url: string, position: StickerPosition, color?: string) => Promise<void>
  onMoveSticker?: (stickerId: string, position: StickerPosition) => Promise<void>
  onRemoveSticker?: (stickerId: string) => Promise<void>
  containerRef?: React.RefObject<HTMLElement>
}

export const StickerCanvas: React.FC<StickerCanvasProps> = ({
  stickers = [],
  onAddSticker = async () => {},
  onMoveSticker = async () => {},
  onRemoveSticker = async () => {},
  containerRef,
}) => {
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null)
  const [selectedStickerUrl, setSelectedStickerUrl] = useState<string | null>(null)
  const [movingStickerId, setMovingStickerId] = useState<string | null>(null)
  const [position, setPosition] = useState<StickerPosition>({ x: 0, y: 0 })
  const [mode, setMode] = useState<"none" | "placing" | "moving">("none")

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mode !== "placing" && mode !== "moving") return

    if (!containerRef?.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setPosition({ x, y })
  }

  const handleClick = async (e: React.MouseEvent) => {
    if (mode === "placing" && selectedSticker && selectedStickerUrl) {
      e.stopPropagation()
      await onAddSticker(selectedSticker, selectedStickerUrl, position)
      setMode("none")
      setSelectedSticker(null)
      setSelectedStickerUrl(null)
    }
  }

  const handleStickerClick = (e: React.MouseEvent, stickerId: string) => {
    e.stopPropagation()
    setMovingStickerId(stickerId)
    setMode("moving")
  }

  const handleStickerMove = async (e: React.MouseEvent) => {
    if (mode === "moving" && movingStickerId) {
      e.stopPropagation()
      await onMoveSticker(movingStickerId, position)
      setMovingStickerId(null)
      setMode("none")
    }
  }

  const handleStickerRemove = async (e: React.MouseEvent, stickerId: string) => {
    e.stopPropagation()
    await onRemoveSticker(stickerId)
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onMouseUp={handleStickerMove}
    >
      {stickers.map((sticker) => (
        <div
          key={sticker.id}
          className="absolute cursor-move pointer-events-auto"
          style={{
            left: `${sticker.position.x}%`,
            top: `${sticker.position.y}%`,
            transform: "translate(-50%, -50%)",
          }}
          onMouseDown={(e) => handleStickerClick(e, sticker.id)}
          onDoubleClick={(e) => handleStickerRemove(e, sticker.id)}
        >
          <img src={sticker.url || "/placeholder.svg"} alt="Sticker" className="w-8 h-8" />
        </div>
      ))}

      {mode === "placing" && selectedStickerUrl && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <img src={selectedStickerUrl || "/placeholder.svg"} alt="Selected Sticker" className="w-8 h-8 opacity-70" />
        </div>
      )}
    </div>
  )
}
