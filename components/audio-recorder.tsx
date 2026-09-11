"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Mic, Square, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { uploadAudio } from "@/lib/audio-storage"
import { isPremiumUser } from "@/lib/premium-service"
import { useAuth } from "@/contexts/auth-context"

type AudioRecorderProps = {
  boardId: string
  cardId?: string
  onRecordingComplete?: () => void
}

export function AudioRecorder({ boardId, cardId, onRecordingComplete }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const { toast } = useToast()
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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop()
      }
    }
  }, [isRecording])

  const startRecording = async () => {
    try {
      // Check if premium
      if (!isPremium) {
        toast({
          title: "Premium Feature",
          description: "Audio recording is available for premium users only.",
          variant: "destructive",
        })
        return
      }

      // Reset state
      audioChunksRef.current = []
      setRecordingTime(0)
      setAudioBlob(null)

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Create blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        setAudioBlob(audioBlob)

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop())

        // Clear timer
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      }

      // Start recording
      mediaRecorder.start()
      setIsRecording(true)

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          // Auto-stop after 60 seconds
          if (prev >= 60) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch (error) {
      console.error("Error starting recording:", error)
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const uploadRecording = async () => {
    if (!audioBlob) return

    setIsUploading(true)
    try {
      // Generate filename with timestamp
      const timestamp = Date.now()
      const fileName = `recording_${timestamp}.webm`

      // Audio upload is disabled (no object storage in v1)
      const result = await uploadAudio(audioBlob, fileName, boardId, recordingTime, cardId)

      if (result) {
        toast({
          title: "Recording Uploaded",
          description: "Your audio recording has been saved.",
        })

        // Reset state
        setAudioBlob(null)
        setRecordingTime(0)

        // Notify parent component
        if (onRecordingComplete) {
          onRecordingComplete()
        }
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      console.error("Error uploading recording:", error)
      toast({
        title: "Upload Error",
        description: "Failed to upload recording. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {isRecording ? "Recording..." : audioBlob ? "Recording Complete" : "Record Audio"}
        </div>
        <div className="text-sm text-muted-foreground">{formatTime(recordingTime)}</div>
      </div>

      {isRecording && <Progress value={(recordingTime / 60) * 100} className="h-2" />}

      <div className="flex gap-2">
        {!isRecording && !audioBlob && (
          <Button onClick={startRecording} className="flex-1" disabled={isUploading}>
            <Mic className="mr-2 h-4 w-4" />
            Start Recording
          </Button>
        )}

        {isRecording && (
          <Button onClick={stopRecording} variant="destructive" className="flex-1">
            <Square className="mr-2 h-4 w-4" />
            Stop Recording
          </Button>
        )}

        {audioBlob && !isRecording && (
          <Button onClick={uploadRecording} className="flex-1" disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Save Recording"
            )}
          </Button>
        )}

        {audioBlob && !isRecording && !isUploading && (
          <Button onClick={() => setAudioBlob(null)} variant="outline">
            Discard
          </Button>
        )}
      </div>
    </div>
  )
}
