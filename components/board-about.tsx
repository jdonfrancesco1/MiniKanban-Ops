"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Pencil, Save, X, Trash2 } from "lucide-react"
import { FormattedDescription } from "./formatted-description"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"

interface BoardAboutProps {
  isOpen: boolean
  onClose: () => void
  initialDescription: string
  onSave: (description: string) => void
  boardId: string
}

export default function BoardAbout({ isOpen, onClose, initialDescription, onSave, boardId }: BoardAboutProps) {
  const [description, setDescription] = useState<string>(initialDescription || "")
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)

  // Reset state when modal opens with new initialDescription
  useEffect(() => {
    if (isOpen) {
      setDescription(initialDescription || "")
      setIsEditing(!initialDescription) // Start in edit mode if no description
    }
  }, [isOpen, initialDescription])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = () => {
    onSave(description)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setDescription(initialDescription || "")
    setIsEditing(false)
  }

  const handleDelete = () => {
    setShowDeleteConfirm(true)
  }

  const confirmDelete = () => {
    onSave("")
    setDescription("")
    setShowDeleteConfirm(false)
    setIsEditing(false)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto bg-background/95 backdrop-blur border border-muted/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">About This Board</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {isEditing ? (
              <div className="border rounded-md p-1">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description for this board..."
                  className="min-h-[200px] resize-none"
                />
              </div>
            ) : (
              <div className="min-h-[100px] p-4 rounded-md border bg-muted/20">
                {description ? (
                  <FormattedDescription description={description} />
                ) : (
                  <p className="text-muted-foreground italic">No description provided. Click edit to add one.</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center mt-4">
            <div>
              {isEditing ? (
                <Button variant="outline" onClick={handleCancel} className="mr-2">
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
              ) : description ? (
                <Button variant="outline" onClick={handleDelete} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-1" /> Delete
                </Button>
              ) : null}
            </div>
            <div>
              {isEditing ? (
                <Button onClick={handleSave}>
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              ) : (
                <Button onClick={handleEdit}>
                  <Pencil className="h-4 w-4 mr-1" /> {description ? "Edit" : "Add Description"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Board Description</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this board description? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
