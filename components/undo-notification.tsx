"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type UndoAction = {
  id: string
  type: "column" | "task"
  name: string
  data: any
  timestamp: number
}

type UndoNotificationProps = {
  action: UndoAction | null
  onUndo: () => void
  onDismiss: () => void
  duration?: number
}

export function UndoNotification({ action, onUndo, onDismiss, duration = 10000 }: UndoNotificationProps) {
  const [secondsLeft, setSecondsLeft] = useState(10)
  const [isVisible, setIsVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Handle visibility and timer setup
  useEffect(() => {
    if (action) {
      setIsVisible(true)
      setSecondsLeft(Math.floor(duration / 1000))

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }

      // Set up a countdown timer that updates every second
      timerRef.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            // When we reach zero, dismiss and clear the timer
            onDismiss()
            if (timerRef.current) {
              clearInterval(timerRef.current)
              timerRef.current = null
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      setIsVisible(false)
      // Clear timer when action is dismissed
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [action, duration, onDismiss])

  if (!action) return null

  const actionText = action.type === "column" ? "Column" : "Task"
  const progressPercentage = (secondsLeft / (duration / 1000)) * 100

  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-50 w-80 transform transition-all duration-300 ease-in-out",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
      )}
    >
      <div className="bg-card rounded-lg border shadow-lg overflow-hidden">
        <div className="p-4 relative">
          <div className="flex justify-between items-start">
            <div className="flex-1 pr-4">
              <h4 className="text-sm font-medium">
                {actionText} "{action.name}" deleted
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                This action can be undone for the next {secondsLeft} seconds.
              </p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-1" onClick={onDismiss}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
              onClick={onUndo}
            >
              Undo
            </Button>
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              Dismiss
            </Button>
          </div>

          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-100 ease-linear"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
