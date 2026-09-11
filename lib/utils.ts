import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// This is a utility function to help with undo functionality
// It's a no-op here since the actual implementation is in the UndoContext
export function clearUndoAction() {
  // This is just a placeholder function to satisfy the import
  // The actual implementation is in the UndoContext
  console.log("clearUndoAction called from utils")
  return
}
