"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { MessageSquare, Send, Phone, CheckCircle, XCircle, Clock, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// Mock types to match the real ones
type MockTimestamp = {
  toDate: () => Date
  toMillis: () => number
}

type MockChatMessage = {
  id: string
  boardId: string
  senderId: string
  senderName: string
  senderPhone?: string
  message: string
  timestamp: MockTimestamp
  sentToPhone?: boolean
  deliveryStatus?: "pending" | "sent" | "delivered" | "failed"
}

type MockBoardMember = {
  id: string
  name: string
  phoneNumber: string
  role: "owner" | "editor" | "viewer"
  lastActive?: MockTimestamp
}

// Mock data
const mockMessages: MockChatMessage[] = [
  {
    id: "msg-1",
    boardId: "demo",
    senderId: "user-1",
    senderName: "Alex Johnson",
    message: "Hey team, I just added a new task for the wireframes. Can someone take a look?",
    timestamp: {
      toDate: () => new Date(Date.now() - 3600000), // 1 hour ago
      toMillis: () => Date.now() - 3600000,
    },
  },
  {
    id: "msg-2",
    boardId: "demo",
    senderId: "user-2",
    senderName: "Taylor Smith",
    message: "I can review them this afternoon. Are there any specific areas you want feedback on?",
    timestamp: {
      toDate: () => new Date(Date.now() - 3000000), // 50 minutes ago
      toMillis: () => Date.now() - 3000000,
    },
  },
  {
    id: "msg-3",
    boardId: "demo",
    senderId: "user-1",
    senderName: "Alex Johnson",
    message: "Mainly the user flow and navigation. Thanks!",
    timestamp: {
      toDate: () => new Date(Date.now() - 2700000), // 45 minutes ago
      toMillis: () => Date.now() - 2700000,
    },
  },
  {
    id: "msg-4",
    boardId: "demo",
    senderId: "user-3",
    senderName: "Jordan Lee",
    senderPhone: "+15551234567",
    message: 'I moved the authentication task to "Done". The phone verification is working now.',
    timestamp: {
      toDate: () => new Date(Date.now() - 1800000), // 30 minutes ago
      toMillis: () => Date.now() - 1800000,
    },
    sentToPhone: true,
    deliveryStatus: "delivered",
  },
]

const mockMembers: MockBoardMember[] = [
  {
    id: "user-1",
    name: "Alex Johnson",
    phoneNumber: "+15551234567",
    role: "owner",
    lastActive: {
      toDate: () => new Date(Date.now() - 300000), // 5 minutes ago
      toMillis: () => Date.now() - 300000,
    },
  },
  {
    id: "user-2",
    name: "Taylor Smith",
    phoneNumber: "+15559876543",
    role: "editor",
    lastActive: {
      toDate: () => new Date(Date.now() - 60000), // 1 minute ago
      toMillis: () => Date.now() - 60000,
    },
  },
  {
    id: "user-3",
    name: "Jordan Lee",
    phoneNumber: "+15555555555",
    role: "editor",
    lastActive: {
      toDate: () => new Date(Date.now() - 7200000), // 2 hours ago
      toMillis: () => Date.now() - 7200000,
    },
  },
  {
    id: "user-4",
    name: "Casey Wilson",
    phoneNumber: "",
    role: "viewer",
    lastActive: {
      toDate: () => new Date(Date.now() - 86400000), // 1 day ago
      toMillis: () => Date.now() - 86400000,
    },
  },
]

export function DemoBoardChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<MockChatMessage[]>(mockMessages)
  const [members, setMembers] = useState<MockBoardMember[]>(mockMembers)
  const [newMessage, setNewMessage] = useState("")
  const [sendToPhones, setSendToPhones] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    setIsLoading(true)

    // Simulate sending a message
    setTimeout(() => {
      const newMsg: MockChatMessage = {
        id: `msg-${Date.now()}`,
        boardId: "demo",
        senderId: "demo-user",
        senderName: "You (Demo)",
        message: newMessage,
        timestamp: {
          toDate: () => new Date(),
          toMillis: () => Date.now(),
        },
        sentToPhone: sendToPhones,
        deliveryStatus: sendToPhones ? "sent" : undefined,
      }

      setMessages([...messages, newMsg])
      setNewMessage("")
      setIsLoading(false)

      if (sendToPhones) {
        toast({
          title: "Demo: Message sent",
          description: "In a real app, this would send SMS to team members",
        })
      }
    }, 500)
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const formatTime = (timestamp: MockTimestamp) => {
    if (!timestamp) return ""

    const date = timestamp.toDate()
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(date)
  }

  const getDeliveryStatusIcon = (status?: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "delivered":
        return <CheckCircle className="h-3 w-3 text-green-500" />
      case "failed":
        return <XCircle className="h-3 w-3 text-red-500" />
      case "pending":
      default:
        return <Clock className="h-3 w-3 text-yellow-500" />
    }
  }

  const isActiveRecently = (lastActive?: MockTimestamp) => {
    if (!lastActive) return false

    const now = new Date()
    const lastActiveDate = lastActive.toDate()
    const diffMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60)

    return diffMinutes < 5 // Active in the last 5 minutes
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Team Chat (Demo)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>Team Chat (Demo)</DialogTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowMembers(!showMembers)}>
                {showMembers ? <MessageSquare className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              </Button>
            </div>
          </DialogHeader>

          {showMembers ? (
            <ScrollArea className="flex-1 p-4">
              <h3 className="font-medium mb-2">Team Members</h3>
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {member.phoneNumber && <Phone className="h-3 w-3 mr-2 text-muted-foreground" />}
                      <div
                        className={`h-2 w-2 rounded-full ${
                          isActiveRecently(member.lastActive) ? "bg-green-500" : "bg-gray-300"
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => {
                  const isCurrentUser = message.senderId === "demo-user"

                  return (
                    <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`flex ${isCurrentUser ? "flex-row-reverse" : "flex-row"} items-start gap-2 max-w-[80%]`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className={`flex items-center gap-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                            <span className="text-xs text-muted-foreground">{message.senderName}</span>
                            <span className="text-xs text-muted-foreground">
                              {message.timestamp && formatTime(message.timestamp)}
                            </span>
                            {message.sentToPhone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                {getDeliveryStatusIcon(message.deliveryStatus)}
                              </span>
                            )}
                          </div>
                          <div
                            className={`rounded-lg p-3 mt-1 ${
                              isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          )}

          <form onSubmit={handleSendMessage} className="p-4 border-t mt-auto">
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                id="send-to-phones"
                checked={sendToPhones}
                onCheckedChange={(checked) => setSendToPhones(checked as boolean)}
              />
              <Label htmlFor="send-to-phones" className="text-sm cursor-pointer">
                Also send as SMS to team members (Demo)
              </Label>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" size="icon" disabled={isLoading || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
