"use client"

import { createContext, useState, useCallback, useContext, type ReactNode } from "react"
import { UndoNotification, type UndoAction } from "@/components/undo-notification"
import { restoreColumn, restoreTask, type Column, type Task, getBoard } from "@/lib/db-service"
import { useToast } from "@/hooks/use-toast"

// Define a custom event for column restoration
export const COLUMN_RESTORED_EVENT = "column-restored"
export const TASK_RESTORED_EVENT = "task-restored"

type UndoContextType = {
  addUndoAction: (action: Omit<UndoAction, "timestamp">) => void
  clearUndoAction: () => void
}

const UndoContext = createContext<UndoContextType | undefined>(undefined)

// Add this function after the UndoContext declaration
export function useUndoContext() {
  const context = useContext(UndoContext)
  if (context === undefined) {
    throw new Error("useUndoContext must be used within an UndoProvider")
  }
  return context
}

export function UndoProvider({ children }: { children: ReactNode }) {
  const [currentAction, setCurrentAction] = useState<UndoAction | null>(null)
  const { toast } = useToast()

  const addUndoAction = useCallback((action: Omit<UndoAction, "timestamp">) => {
    console.log("[UndoProvider] Adding undo action:", action)
    setCurrentAction({
      ...action,
      timestamp: Date.now(),
    })
  }, [])

  const clearUndoAction = useCallback(() => {
    console.log("[UndoProvider] Clearing undo action")
    setCurrentAction(null)
  }, [])

  // Fix the handleUndo function to properly handle the column restoration
  const handleUndo = useCallback(async () => {
    if (!currentAction) return

    try {
      console.log("[UndoProvider] Handling undo for action:", currentAction)

      if (currentAction.type === "column") {
        const columnData = currentAction.data as { boardId: string; column: Column }
        console.log("[UndoProvider] Restoring column:", columnData)

        // Get the board ID and column from the data
        const { boardId, column } = columnData

        // Restore the column
        const result = await restoreColumn(boardId, column)

        if (result.success) {
          toast({
            title: "Column restored",
            description: `Column "${currentAction.name}" has been restored.`,
          })

          // Dispatch a custom event to notify components that a column has been restored
          const event = new CustomEvent(COLUMN_RESTORED_EVENT, {
            detail: { boardId, column },
          })
          window.dispatchEvent(event)

          // Verify the column was restored to the database
          setTimeout(async () => {
            try {
              const board = await getBoard(boardId)
              const columnExists = board.columns.some((col) => col.id === column.id)
              console.log(`[UndoProvider] Column ${column.id} exists in database after restore: ${columnExists}`)

              if (!columnExists) {
                console.error("[UndoProvider] Column was not properly restored to the database")
                toast({
                  title: "Warning",
                  description: "Column may not have been properly restored. Please refresh the page.",
                  variant: "destructive",
                })
              }
            } catch (error) {
              console.error("[UndoProvider] Error verifying column restoration:", error)
            }
          }, 1000)
        } else {
          throw new Error(result.error || "Failed to restore column")
        }
      } else if (currentAction.type === "task") {
        // Task restoration code remains the same
        const { task, columnId, boardId } = currentAction.data as {
          task: Task
          columnId: string
          boardId: string
        }

        console.log("[UndoProvider] Restoring task:", task, "to column:", columnId)
        const result = await restoreTask(boardId, columnId, task)

        if (result.success) {
          toast({
            title: "Task restored",
            description: `Task "${currentAction.name}" has been restored.`,
          })

          // Dispatch a custom event to notify components that a task has been restored
          const event = new CustomEvent(TASK_RESTORED_EVENT, {
            detail: { boardId, columnId, task },
          })
          window.dispatchEvent(event)
        } else {
          throw new Error(result.error || "Failed to restore task")
        }
      }
    } catch (error) {
      console.error("[UndoProvider] Error undoing action:", error)
      toast({
        title: "Error",
        description: "Failed to restore item. Please try again.",
        variant: "destructive",
      })
    } finally {
      clearUndoAction()
    }
  }, [currentAction, clearUndoAction, toast])

  return (
    <UndoContext.Provider value={{ addUndoAction, clearUndoAction }}>
      {children}
      <UndoNotification action={currentAction} onUndo={handleUndo} onDismiss={clearUndoAction} duration={10000} />
    </UndoContext.Provider>
  )
}

export { UndoContext }
