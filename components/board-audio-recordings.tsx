"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Mic, Loader2 } from "lucide-react"
import { AudioRecorder } from "@/components/audio-recorder"
import { AudioPlayer } from "@/components/audio-player"
import { getAudioRecordings, type AudioRecording } from "@/lib/audio-storage"
import { isPremiumUser } from "@/lib/premium-service"
import { useAuth } from "@/contexts/auth-context"

type BoardAudioRecordingsProps = {
  boardId: string
}

export default function BoardAudioRecordings({ boardId }: BoardAudioRecordingsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [recordings, setRecordings] = useState<AudioRecording[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showRecorder, setShowRecorder] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const { user } = useAuth()

  // Check if user has premium access
  useEffect(() => {
    const checkPremium = async () => {
      const hasPremium = await isPremiumUser()
      setIsPremium(hasPremium)
    }

    if (user) {
      checkPremium()
    }
  }, [user])

  // Load recordings when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadRecordings()
    }
  }, [isOpen, boardId])

  const loadRecordings = async () => {
    setIsLoading(true)
    try {
      const data = await getAudioRecordings(boardId)
      setRecordings(data)
    } catch (error) {
      console.error("Error loading recordings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecordingComplete = () => {
    setShowRecorder(false)
    loadRecordings()
  }

  const handleDeleteRecording = () => {
    loadRecordings()
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed bottom-4 left-4 h-12 w-12 rounded-full shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              <Mic className="h-6 w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Voice Notes</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle>Voice Notes</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {showRecorder ? (
              <div className="p-4 border rounded-md mb-4">
                <AudioRecorder boardId={boardId} onRecordingComplete={handleRecordingComplete} />
              </div>
            ) : (
              <div className="mb-4">
                <Button onClick={() => setShowRecorder(true)} className="w-full" disabled={!isPremium}>
                  <Mic className="mr-2 h-4 w-4" />
                  Record New Voice Note
                </Button>
                {!isPremium && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">Voice notes are a premium feature</p>
                )}
              </div>
            )}

            <div className="flex-1 overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : recordings.length > 0 ? (
                <ScrollArea className="h-full pr-4">
                  <div className="space-y-4 pb-4">
                    {recordings.map((recording) => (
                      <AudioPlayer key={recording.id} recording={recording} onDelete={handleDeleteRecording} />
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <Mic className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium">No voice notes yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Record voice notes to share thoughts and ideas with your team
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
