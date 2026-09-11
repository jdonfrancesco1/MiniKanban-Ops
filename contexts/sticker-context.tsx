"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type StickerMode = "none" | "placing" | "moving"

type StickerContextType = {
  mode: StickerMode
  setMode: (mode: StickerMode) => void
  selectedSticker: string | null
  setSelectedSticker: (stickerId: string | null) => void
  selectedStickerUrl: string | null
  setSelectedStickerUrl: (url: string | null) => void
  selectedColor: string | null
  setSelectedColor: (color: string | null) => void
}

const StickerContext = createContext<StickerContextType | undefined>(undefined)

export const useStickerContext = () => {
  const context = useContext(StickerContext)
  if (context === undefined) {
    throw new Error("useStickerContext must be used within a StickerProvider")
  }
  return context
}

export const StickerProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<StickerMode>("none")
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null)
  const [selectedStickerUrl, setSelectedStickerUrl] = useState<string | null>(null)
  const [selectedColor, setSelectedColor] = useState<string | null>(null)

  return (
    <StickerContext.Provider
      value={{
        mode,
        setMode,
        selectedSticker,
        setSelectedSticker,
        selectedStickerUrl,
        setSelectedStickerUrl,
        selectedColor,
        setSelectedColor,
      }}
    >
      {children}
    </StickerContext.Provider>
  )
}

export default StickerContext
