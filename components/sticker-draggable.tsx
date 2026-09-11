"use client"

import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import type { Sticker } from "@/lib/sticker-data"

interface StickerDraggableProps {
  sticker: Sticker
  onDragStart?: (sticker: Sticker) => void
  className?: string
  size?: number
}

export function StickerDraggable({ sticker, onDragStart, className = "", size = 40 }: StickerDraggableProps) {
  const [isDragging, setIsDragging] = useState(false)
  const stickerRef = useRef<HTMLDivElement>(null)

  // Create a ghost image for dragging with transparent background
  useEffect(() => {
    if (!stickerRef.current) return

    const element = stickerRef.current

    element.ondragstart = (e) => {
      // Create a transparent clone for the drag image
      const dragImage = new Image()
      dragImage.src = sticker.src
      dragImage.width = size
      dragImage.height = size

      // Set the drag image
      e.dataTransfer?.setDragImage(dragImage, size / 2, size / 2)

      // Set data for the drag operation
      e.dataTransfer?.setData("application/json", JSON.stringify(sticker))

      setIsDragging(true)
      onDragStart?.(sticker)
    }

    element.ondragend = () => {
      setIsDragging(false)
    }
  }, [sticker, size, onDragStart])

  return (
    <div
      ref={stickerRef}
      className={`sticker-draggable cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""} ${className}`}
      draggable="true"
      style={{
        width: size,
        height: size,
        position: "relative",
      }}
      title={sticker.name}
    >
      <div className="sticker-image-container" style={{ width: size, height: size }}>
        <Image
          src={sticker.src || "/placeholder.svg"}
          alt={sticker.name}
          width={size}
          height={size}
          className="sticker-image"
          style={{ objectFit: "contain" }}
          draggable={false} // Prevent image from being dragged separately
        />
      </div>
    </div>
  )
}
