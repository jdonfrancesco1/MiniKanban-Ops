"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Play, Pause, Trash2, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { deleteAudioRecording, type AudioRecording } from "@/lib/audio-storage"
import { formatDistanceToNow } from "date-fns"

type AudioPlayerProps = {
  recording: AudioRecording
  onDelete?: () => void
}

export function AudioPlayer({ recording, onDelete }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const audio = new Audio(recording.url)
    audioRef.current = audio

    audio.addEventListener("timeupdate", updateProgress)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", updateProgress)
      audio.removeEventListener("ended", handleEnded)
      audio.pause()
      audioRef.current = null
    }
  }, [recording.url])

  const updateProgress = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const togglePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }

    setIsPlaying(!isPlaying)
  }

  const handleSliderChange = (value: number[]) => {
    if (!audioRef.current) return

    const newTime = value[0]
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this recording?")) {
      return
    }

    setIsDeleting(true)
    try {
      // Stop playback if playing
      if (audioRef.current && isPlaying) {
        audioRef.current.pause()
        setIsPlaying(false)
      }

      const success = await deleteAudioRecording(recording.id, recording.fileName, recording.boardId)

      if (success) {
        toast({
          title: "Recording Deleted",
          description: "The audio recording has been removed.",
        })

        if (onDelete) {
          onDelete()
        }
      } else {
        throw new Error("Delete failed")
      }
    } catch (error) {
      console.error("Error deleting recording:", error)
      toast({
        title: "Delete Error",
        description: "Failed to delete recording. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getTimeAgo = () => {
    if (!recording.createdAt) return ""

    try {
      const date = recording.createdAt.toDate()
      return formatDistanceToNow(date, { addSuffix: true })
    } catch (error) {
      return ""
    }
  }

  return (
    <div className="bg-card rounded-lg border p-3 space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-sm font-medium">{recording.createdByName || "Anonymous"}</div>
        <div className="text-xs text-muted-foreground">{getTimeAgo()}</div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={togglePlayPause}>
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>

        <div className="flex-1">
          <Slider
            value={[currentTime]}
            min={0}
            max={recording.duration}
            step={0.1}
            onValueChange={handleSliderChange}
          />
        </div>

        <div className="text-xs text-muted-foreground w-12 text-right">
          {formatTime(currentTime)} / {formatTime(recording.duration)}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
