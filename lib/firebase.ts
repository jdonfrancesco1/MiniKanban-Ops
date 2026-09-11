import { initializeApp, getApps } from "firebase/app"
import { getAuth, connectAuthEmulator } from "firebase/auth"
import { getFirestore, connectFirestoreEmulator, Timestamp } from "firebase/firestore"
import { getStorage, connectStorageEmulator } from "firebase/storage"
import { isPreviewEnvironment } from "./environment"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase
const apps = getApps()
const app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0]

// Initialize Firebase services
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

// Connect to emulators if in development and emulator flag is set
if (
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" &&
  typeof window !== "undefined"
) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099")
    connectFirestoreEmulator(db, "localhost", 8080)
    connectStorageEmulator(storage, "localhost", 9199)
    console.log("Connected to Firebase emulators")
  } catch (error) {
    console.error("Failed to connect to Firebase emulators:", error)
  }
}

// Helper function to check if we're using mock Firebase
function isMockFirebase() {
  return isPreviewEnvironment()
}

export { auth, db, storage, Timestamp, isMockFirebase }
