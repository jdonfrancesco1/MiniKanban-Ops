import type { Board, Column, Task } from "@/lib/types"
import { extractTasksFromBoard } from "@/lib/types"
import {
  addColumn,
  addTask,
  createBoard,
  deleteBoard,
  deleteColumn,
  deleteTask,
  ensureDefaultBoard,
  getBoard,
  getTaskById,
  getUserBoards,
  moveTask,
  permanentlyDeleteTask,
  removeUserFromBoard,
  restoreColumn,
  restoreTask,
  shareBoard,
  updateBoardColumns,
  updateBoardDescription,
  updateBoardTitle,
  updateColumnOrder,
  updateColumnTitle,
  updateTask,
  updateTaskOrder,
} from "@/lib/actions/boards"

export type { Board, BoardSummary, Column, PlacedSticker, StickerPosition, Task } from "@/lib/types"
export { extractTasksFromBoard } from "@/lib/types"
export {
  addColumn,
  addTask,
  createBoard,
  deleteBoard,
  deleteColumn,
  deleteTask,
  ensureDefaultBoard,
  getBoard,
  getTaskById,
  getUserBoards,
  moveTask,
  permanentlyDeleteTask,
  removeUserFromBoard,
  restoreColumn,
  restoreTask,
  shareBoard,
  updateBoardColumns,
  updateBoardDescription,
  updateBoardTitle,
  updateColumnOrder,
  updateColumnTitle,
  updateTask,
  updateTaskOrder,
}

const disabledStickers = { success: false as const }

export async function addStickerToTask() {
  return disabledStickers
}

export async function addStickerToColumn() {
  return disabledStickers
}

export async function updateTaskStickerPosition() {
  return disabledStickers
}

export async function updateColumnStickerPosition() {
  return disabledStickers
}

export async function removeTaskSticker() {
  return disabledStickers
}

export async function removeColumnSticker() {
  return disabledStickers
}

export async function addBoardSticker() {
  return disabledStickers
}

export async function updateBoardStickerPosition() {
  return disabledStickers
}

export async function removeBoardSticker() {
  return disabledStickers
}

export async function addTaskSticker() {
  return disabledStickers
}

export async function addColumnSticker() {
  return disabledStickers
}

export function subscribeToBoard(boardId: string, callback: (board: Board) => void) {
  let cancelled = false

  void getBoard(boardId)
    .then((board) => {
      if (!cancelled) callback(board)
    })
    .catch((error) => {
      console.error("subscribeToBoard failed", error)
    })

  return () => {
    cancelled = true
  }
}

export function clearMockBoards() {
  return { success: true }
}

export class DBService {
  static async getBoard(boardId: string): Promise<Board> {
    return getBoard(boardId)
  }

  static async createBoard(title: string, useProjectPlanningTemplate = false) {
    return createBoard(title, useProjectPlanningTemplate)
  }

  static async updateBoardTitle(boardId: string, title: string) {
    return updateBoardTitle(boardId, title)
  }

  static async updateBoardDescription(boardId: string, description: string) {
    return updateBoardDescription(boardId, description)
  }

  static async updateBoardColumns(boardId: string, nextColumns: Column[]) {
    return updateBoardColumns(boardId, nextColumns)
  }

  static async deleteBoard(boardId: string) {
    return deleteBoard(boardId)
  }

  static async getUserBoards() {
    return getUserBoards()
  }

  static subscribeToBoard(boardId: string, callback: (board: Board) => void) {
    return subscribeToBoard(boardId, callback)
  }

  static async addColumn(boardId: string, title: string) {
    return addColumn(boardId, title)
  }

  static async updateColumnTitle(boardId: string, columnId: string, title: string) {
    return updateColumnTitle(boardId, columnId, title)
  }

  static async deleteColumn(boardId: string, columnId: string) {
    return deleteColumn(boardId, columnId)
  }

  static async restoreColumn(boardId: string, column: Column) {
    return restoreColumn(boardId, column)
  }

  static async addTask(
    boardId: string,
    columnId: string,
    task: Omit<Task, "id" | "createdAt" | "updatedAt" | "createdBy">,
  ) {
    return addTask(boardId, columnId, task)
  }

  static async updateTask(
    boardId: string,
    columnId: string,
    taskId: string,
    updates: Partial<Omit<Task, "id" | "createdAt" | "createdBy" | "archivedAt">>,
  ) {
    return updateTask(boardId, columnId, taskId, updates)
  }

  static async deleteTask(boardId: string, columnId: string, taskId: string) {
    return deleteTask(boardId, columnId, taskId)
  }

  static async restoreTask(boardId: string, columnId: string, task: Task) {
    return restoreTask(boardId, columnId, task)
  }

  static async permanentlyDeleteTask(boardId: string, taskId: string) {
    return permanentlyDeleteTask(boardId, taskId)
  }

  static async moveTask(
    boardId: string,
    sourceColumnId: string,
    taskId: string,
    destinationColumnId: string,
    targetPosition: number,
  ) {
    return moveTask(boardId, sourceColumnId, taskId, destinationColumnId, targetPosition)
  }

  static async shareBoard(boardId: string, userPhone: string) {
    return shareBoard(boardId, userPhone)
  }

  static async removeUserFromBoard(boardId: string, userId: string) {
    return removeUserFromBoard(boardId, userId)
  }

  static async updateColumnOrder(boardId: string, columnIds: string[]) {
    return updateColumnOrder(boardId, columnIds)
  }

  static async addStickerToTask() {
    return disabledStickers
  }

  static async addStickerToColumn() {
    return disabledStickers
  }

  static async updateTaskStickerPosition() {
    return disabledStickers
  }

  static async updateColumnStickerPosition() {
    return disabledStickers
  }

  static async removeTaskSticker() {
    return disabledStickers
  }

  static async removeColumnSticker() {
    return disabledStickers
  }

  static async updateTaskOrder(boardId: string, columnId: string, taskIds: string[]) {
    return updateTaskOrder(boardId, columnId, taskIds)
  }

  static async addBoardSticker() {
    return disabledStickers
  }

  static async updateBoardStickerPosition() {
    return disabledStickers
  }

  static async removeBoardSticker() {
    return disabledStickers
  }

  static async addTaskSticker() {
    return disabledStickers
  }

  static async addColumnSticker() {
    return disabledStickers
  }

  static clearMockBoards() {
    return clearMockBoards()
  }

  static extractTasksFromBoard(board: Board): Task[] {
    return extractTasksFromBoard(board)
  }

  static async ensureDefaultBoard() {
    return ensureDefaultBoard()
  }
}
