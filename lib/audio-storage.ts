export type AudioRecording = {
  id: string
  boardId: string
  fileName: string
  url: string
  createdAt?: string
}

export async function uploadAudio(_blob: Blob, _fileName: string, _boardId: string) {
  throw new Error("Audio recording is disabled after the Firebase Storage removal.")
}

export async function getAudioRecordings(_boardId: string): Promise<AudioRecording[]> {
  return []
}

export async function deleteAudioRecording(_fileName: string, _recordingId?: string) {
  return { success: false }
}
