import * as functions from "firebase-functions"
import * as admin from "firebase-admin"

// Initialize Firebase Admin
admin.initializeApp()

const db = admin.firestore()
const storage = admin.storage()

// Cloud Function that runs daily to clean up expired audio recordings
export const cleanupExpiredAudio = functions.pubsub
  .schedule("0 0 * * *") // Run at midnight every day
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now()

    try {
      // Query for expired recordings
      const expiredRecordings = await db.collection("audio_recordings").where("expiresAt", "<=", now).get()

      if (expiredRecordings.empty) {
        console.log("No expired audio recordings to clean up")
        return null
      }

      console.log(`Found ${expiredRecordings.size} expired audio recordings to delete`)

      // Delete each expired recording
      const deletePromises = expiredRecordings.docs.map(async (doc) => {
        const recording = doc.data()
        const filePath = `audio/${recording.boardId}/${recording.fileName}`

        try {
          // Delete from Storage
          const file = storage.bucket().file(filePath)
          await file.delete()
          console.log(`Deleted file: ${filePath}`)
        } catch (error) {
          console.error(`Error deleting file ${filePath}:`, error)
          // Continue with Firestore deletion even if Storage deletion fails
        }

        // Delete from Firestore
        await doc.ref.delete()
        console.log(`Deleted Firestore document for recording: ${doc.id}`)

        return doc.id
      })

      await Promise.all(deletePromises)
      console.log(`Successfully cleaned up ${expiredRecordings.size} expired audio recordings`)

      return null
    } catch (error) {
      console.error("Error cleaning up expired audio recordings:", error)
      throw error
    }
  })
