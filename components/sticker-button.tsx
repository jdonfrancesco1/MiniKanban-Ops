"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sticker } from "lucide-react"
import { StickerPanel } from "./sticker-panel"
import type { StickerItem } from "./sticker-panel"
import { cn } from "@/lib/utils"

type StickerButtonProps = {
  onStickerSelect: (sticker: StickerItem) => void
  className?: string
  variant?: "default" | "outline" | "ghost" | "floating"
  size?: "sm" | "md" | "lg"
}

export default function StickerButton({
  onStickerSelect,
  className,
  variant = "default",
  size = "md",
}: StickerButtonProps) {
  const [showStickerPanel, setShowStickerPanel] = useState(false)

  const handleStickerSelect = (sticker: StickerItem) => {
    onStickerSelect(sticker)
    setShowStickerPanel(false)
  }

  if (variant === "floating") {
    return (
      <>
        <button className="sticker-floating-button" onClick={() => setShowStickerPanel(true)} aria-label="Add sticker">
          <Sticker className="h-6 w-6" />
        </button>

        <StickerPanel
          open={showStickerPanel}
          onOpenChange={setShowStickerPanel}
          onStickerSelect={handleStickerSelect}
        />
      </>
    )
  }

  const sizeClasses = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4",
    lg: "h-12 px-6 text-lg",
  }

  return (
    <>
      <Button variant={variant} className={cn(sizeClasses[size], className)} onClick={() => setShowStickerPanel(true)}>
        <Sticker
          className={cn("mr-2", {
            "h-3 w-3": size === "sm",
            "h-4 w-4": size === "md",
            "h-5 w-5": size === "lg",
          })}
        />
        Add Sticker
      </Button>

      <StickerPanel open={showStickerPanel} onOpenChange={setShowStickerPanel} onStickerSelect={handleStickerSelect} />
    </>
  )
}
