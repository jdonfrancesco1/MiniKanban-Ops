import { Timestamp } from "./firebase"

// Types
export type ChatMessage = {
  id: string
  boardId: string
  senderId: string
  senderName: string
  senderPhone?: string
  message: string
  timestamp: any
  sentToPhone?: boolean
  deliveryStatus?: "pending" | "sent" | "delivered" | "failed"
}

export type BoardMember = {
  id: string
  name: string
  phoneNumber: string
  role: "owner" | "editor" | "viewer"
  lastActive?: any
}

// Mock data
const mockMessages: Record<string, ChatMessage[]> = {}
const mockMembers: Record<string, BoardMember[]> = {}

// Send a chat message
export async function sendChatMessage(boardId: string, message: string, sendToPhones = false): Promise<ChatMessage> {
  if (!mockMessages[boardId]) {
    mockMessages[boardId] = []
  }

  const newMessage: ChatMessage = {
    id: `msg-${Date.now()}`,
    boardId,
    senderId: "mock-user-id",
    senderName: "Preview User",
    message,
    timestamp: Timestamp.now(),
    sentToPhone: sendToPhones,
    deliveryStatus: sendToPhones ? "sent" : undefined,
  }

  mockMessages[boardId].push(newMessage)

  return newMessage
}

export function subscribeToBoardMessages(boardId: string, callback: (messages: ChatMessage[]) => void) {
  // Initialize with default messages if none exist
  if (!mockMessages[boardId]) {
    mockMessages[boardId] = [
      {
        id: "mock-message-1",
        boardId,
        senderId: "mock-user-1",
        senderName: "Alex",
        message: "Hey team, check out the new design!",
        timestamp: Timestamp.now(),
      },
      {
        id: "mock-message-2",
        boardId,
        senderId: "mock-user-2",
        senderName: "Taylor",
        message: "Looks great! When can we implement it?",
        timestamp: Timestamp.now(),
      },
    ]
  }

  // Immediately call with mock data
  setTimeout(() => {
    callback(mockMessages[boardId] || [])
  }, 0)

  // Return mock unsubscribe function
  return () => {}
}

export function subscribeToBoardMembers(boardId: string, callback: (members: BoardMember[]) => void) {
  // Initialize with default members if none exist
  if (!mockMembers[boardId]) {
    mockMembers[boardId] = [
      {
        id: "mock-member-1",
        name: "Alex Johnson",
        phoneNumber: "+1234567890",
        role: "owner",
      },
      {
        id: "mock-member-2",
        name: "Taylor Smith",
        phoneNumber: "+0987654321",
        role: "editor",
      },
    ]
  }

  // Immediately call with mock data
  setTimeout(() => {
    callback(mockMembers[boardId] || [])
  }, 0)

  // Return mock unsubscribe function
  return () => {}
}

export async function updateUserPresence(boardId: string) {
  // Do nothing in mock implementation
  return
}
