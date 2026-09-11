import { doc, getDoc } from "firebase/firestore"
import { db, isMockFirebase } from "@/lib/firebase"

// Check if a user has premium access
export async function isPremiumUser(userId?: string): Promise<boolean> {
  // If in preview mode, return true to enable premium features
  if (isMockFirebase()) {
    return true
  }

  try {
    // Get current user if userId not provided
    if (!userId) {
      const { currentUser } = await import("firebase/auth").then((module) => ({
        currentUser: module.getAuth().currentUser,
      }))
      if (!currentUser) {
        return false
      }
      userId = currentUser.uid
    }

    // Check user's subscription status in Firestore
    const userDoc = await getDoc(doc(db, "users", userId))

    if (!userDoc.exists()) {
      return false
    }

    const userData = userDoc.data()

    // Check if user has an active premium subscription
    return (
      userData.isPremium === true &&
      userData.subscriptionStatus === "active" &&
      (userData.subscriptionExpiresAt?.toDate() > new Date() || !userData.subscriptionExpiresAt)
    )
  } catch (error) {
    console.error("Error checking premium status:", error)
    return false
  }
}
