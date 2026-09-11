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
import { useAuth } from "@/contexts/auth-context"
import {
  type ChatMessage,
  type BoardMember,
  sendChatMessage,
  subscribeToBoardMessages,
  subscribeToBoardMembers,
  updateUserPresence,
} from "@/lib/chat-service"
import type { Timestamp } from "firebase/firestore"

type BoardChatProps = {
  boardId: string
}

export function BoardChat({ boardId }: BoardChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [members, setMembers] = useState<BoardMember[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sendToPhones, setSendToPhones] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const { user } = useAuth()

  // Subscribe to messages and members
  useEffect(() => {
    if (!isOpen) return

    // Update user presence
    updateUserPresence(boardId)

    // Subscribe to messages
    const unsubscribeMessages = subscribeToBoardMessages(boardId, (updatedMessages) => {
      setMessages(
        updatedMessages.sort((a, b) => {
          // Sort by timestamp (oldest first)
          const aTime = a.timestamp?.toMillis() || 0
          const bTime = b.timestamp?.toMillis() || 0
          return aTime - bTime
        }),
      )
    })

    // Subscribe to members
    const unsubscribeMembers = subscribeToBoardMembers(boardId, (updatedMembers) => {
      setMembers(updatedMembers)
    })

    // Set up presence interval
    const presenceInterval = setInterval(() => {
      updateUserPresence(boardId)
    }, 60000) // Update every minute

    return () => {
      unsubscribeMessages()
      unsubscribeMembers()
      clearInterval(presenceInterval)
    }
  }, [isOpen, boardId])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isOpen])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !user) return

    setIsLoading(true)
    try {
      await sendChatMessage(boardId, newMessage, sendToPhones)
      setNewMessage("")

      if (sendToPhones) {
        toast({
          title: "Message sent",
          description: "Your message has been sent to team members' phones",
        })
      }
    } catch (error) {
      console.error("Error sending message:", error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  const formatTime = (timestamp: Timestamp) => {
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

  const isActiveRecently = (lastActive?: Timestamp) => {
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
            <p>Team Chat</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>Team Chat</DialogTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowMembers(!showMembers)}>
                {showMembers ? <MessageSquare className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              </Button>
            </div>
          </DialogHeader>

          {showMembers ? (
            <ScrollArea className="flex-1 p-4">
              <h3 className="font-medium mb-2">Team Members</h3>
              <div className="space-y-2">
                {members.length > 0 ? (
                  members.map((member) => (
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
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No team members yet</p>
                )}
              </div>
            </ScrollArea>
          ) : (
            <ScrollArea className="flex-1 p-4">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isCurrentUser = message.senderId === user?.uid

                    return (
                      <div key={message.id} className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`flex ${isCurrentUser ? "flex-row-reverse" : "flex-row"} items-start gap-2 max-w-[80%]`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(message.senderName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div
                              className={`flex items-center gap-1 ${isCurrentUser ? "justify-end" : "justify-start"}`}
                            >
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
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-4">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium">No messages yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">Start the conversation with your team</p>
                </div>
              )}
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
                Also send as SMS to team members
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

// Add default export that points to the named export
export default BoardChat
