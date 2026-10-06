"use client"

import { useEffect, useId, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { CLOSE_SUB_STATUSES, isCloseSubStatus, type CloseSubStatus } from "@/lib/close-sub-status"

export function CloseSubStatusOptions({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  const baseId = useId()
  return (
    <RadioGroup value={value} onValueChange={onValueChange} className="gap-2" data-testid="close-sub-status-options">
      {CLOSE_SUB_STATUSES.map((status) => {
        const id = `${baseId}-${status.replace(/\s+/g, "-")}`
        return (
          <div key={status} className="flex items-center gap-3 rounded-md border border-white/15 px-3 py-2.5">
            <RadioGroupItem value={status} id={id} className="border-white text-white" />
            <Label htmlFor={id} className="flex-1 cursor-pointer text-sm text-white">
              {status}
            </Label>
          </div>
        )
      })}
    </RadioGroup>
  )
}

type CloseSubStatusDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (status: CloseSubStatus) => void
  title?: string
  description?: string
  confirmLabel?: string
  initialValue?: string | null
}

export function CloseSubStatusDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "How is this task closing?",
  description = "Pick one close status. This is stored on the card when it moves to Done.",
  confirmLabel = "Close task",
  initialValue = null,
}: CloseSubStatusDialogProps) {
  const [value, setValue] = useState("")

  useEffect(() => {
    if (!open) return
    setValue(isCloseSubStatus(initialValue) ? initialValue : "")
  }, [open, initialValue])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[440px] bg-[#1f1233] border-white/15 text-white"
        data-testid="close-sub-status-dialog"
      >
        <DialogHeader className="text-left">
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-white/70">{description}</DialogDescription>
        </DialogHeader>
        <CloseSubStatusOptions value={value} onValueChange={setValue} />
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            className="text-white hover:bg-white/10 hover:text-white"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!isCloseSubStatus(value)}
            data-testid="close-sub-status-confirm"
            className="bg-white text-[#1f1233] hover:bg-white/90"
            onClick={() => {
              if (!isCloseSubStatus(value)) return
              onConfirm(value)
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
