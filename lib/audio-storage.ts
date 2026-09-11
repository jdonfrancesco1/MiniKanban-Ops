import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage"
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from "firebase/firestore"
import { storage, db, Timestamp, isMockFirebase } from "@/lib/firebase"

export type AudioRecording = {
  id: string
  url: string
  fileName: string
  createdAt: Timestamp
  expiresAt: Timestamp
  duration: number
  boardId: string
  cardId?: string
  createdBy: string
  createdByName: string
}

// Upload audio blob to Firebase Storage
export async function uploadAudio(
  audioBlob: Blob,
  fileName: string,
  boardId: string,
  duration: number,
  cardId?: string,
): Promise<AudioRecording | null> {
  // If in preview mode, return null
  if (isMockFirebase()) {
    console.log("Mock Firebase: uploadAudio would upload", fileName)
    return null
  }

  try {
    // Get current user
    const { currentUser } = await import("firebase/auth").then((module) => ({
      currentUser: module.getAuth().currentUser,
    }))
    if (!currentUser) {
      throw new Error("User not authenticated")
    }

    // Upload to Firebase Storage
    const storageRef = ref(storage, `audio/${boardId}/${fileName}`)
    await uploadBytes(storageRef, audioBlob)
    const url = await getDownloadURL(storageRef)

    // Calculate expiration date (7 days from now)
    const now = Timestamp.now()
    const expiresAt = new Timestamp(now.seconds + 7 * 24 * 60 * 60, now.nanoseconds)

    // Save metadata to Firestore
    const recordingData = {
      fileName,
      url,
      createdAt: now,
      expiresAt,
      duration,
      boardId,
      cardId,
      createdBy: currentUser.uid,
      createdByName: currentUser.displayName || "Anonymous",
    }

    const docRef = await addDoc(collection(db, "audio_recordings"), recordingData)

    return {
      id: docRef.id,
      ...recordingData,
    }
  } catch (error) {
    console.error("Error uploading audio:", error)
    return null
  }
}

// Get all audio recordings for a board
export async function getAudioRecordings(boardId: string): Promise<AudioRecording[]> {
  // If in preview mode, return empty array
  if (isMockFirebase()) {
    console.log("Mock Firebase: getAudioRecordings would fetch recordings for", boardId)
    return []
  }

  try {
    const q = query(collection(db, "audio_recordings"), where("boardId", "==", boardId))
    const querySnapshot = await getDocs(q)

    const recordings: AudioRecording[] = []
    querySnapshot.forEach((doc) => {
      recordings.push({
        id: doc.id,
        ...doc.data(),
      } as AudioRecording)
    })

    return recordings
  } catch (error) {
    console.error("Error getting audio recordings:", error)
    return []
  }
}

// Delete an audio recording
export async function deleteAudioRecording(recordingId: string, fileName: string, boardId: string): Promise<boolean> {
  // If in preview mode, return true
  if (isMockFirebase()) {
    console.log("Mock Firebase: deleteAudioRecording would delete", fileName)
    return true
  }

  try {
    // Delete from Storage
    const storageRef = ref(storage, `audio/${boardId}/${fileName}`)
    await deleteObject(storageRef)

    // Delete from Firestore
    await deleteDoc(doc(db, "audio_recordings", recordingId))

    return true
  } catch (error) {
    console.error("Error deleting audio recording:", error)
    return false
  }
}
