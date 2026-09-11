"use client"

import { useContext } from "react"
import { UndoContext, UndoProvider } from "@/contexts/undo-context"

export function useUndo() {
  const context = useContext(UndoContext)
  if (context === undefined) {
    throw new Error("useUndo must be used within an UndoProvider")
  }
  return context
}

// Re-export the UndoProvider from the context
export { UndoProvider }
