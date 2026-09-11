export type ChatMessage = {
  id: string
  boardId: string
  senderId: string
  senderName: string
  senderPhone?: string
  message: string
  timestamp: Date
  sentToPhone?: boolean
  deliveryStatus?: "pending" | "sent" | "delivered" | "failed"
}

export type BoardMember = {
  id: string
  name: string
  phoneNumber: string
  role: "owner" | "editor" | "viewer"
  lastActive?: Date
}

const mockMessages: Record<string, ChatMessage[]> = {}
const mockMembers: Record<string, BoardMember[]> = {}

export async function sendChatMessage(boardId: string, message: string, sendToPhones = false): Promise<ChatMessage> {
  if (!mockMessages[boardId]) {
    mockMessages[boardId] = []
  }

  const newMessage: ChatMessage = {
    id: `msg-${Date.now()}`,
    boardId,
    senderId: "ops",
    senderName: "Ops",
    message,
    timestamp: new Date(),
    sentToPhone: sendToPhones,
    deliveryStatus: sendToPhones ? "sent" : undefined,
  }

  mockMessages[boardId].push(newMessage)
  return newMessage
}

export function subscribeToBoardMessages(boardId: string, callback: (messages: ChatMessage[]) => void) {
  if (!mockMessages[boardId]) {
    mockMessages[boardId] = []
  }

  setTimeout(() => {
    callback(mockMessages[boardId] || [])
  }, 0)

  return () => {}
}

export function subscribeToBoardMembers(boardId: string, callback: (members: BoardMember[]) => void) {
  if (!mockMembers[boardId]) {
    mockMembers[boardId] = [
      {
        id: "ops",
        name: "James / Orca",
        phoneNumber: "",
        role: "owner",
      },
    ]
  }

  setTimeout(() => {
    callback(mockMembers[boardId] || [])
  }, 0)

  return () => {}
}

export async function updateUserPresence(_boardId: string) {
  return
}
