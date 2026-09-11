// Utility to detect if we're running in the v0 preview environment
export function isPreviewEnvironment(): boolean {
  // Check if we're in a browser environment
  if (typeof window === "undefined") {
    return false
  }

  // Check for v0 preview environment indicators
  const isV0Preview =
    // Check for v0.dev domain
    window.location.hostname.includes("v0.dev") ||
    // Check for preview URL patterns
    window.location.hostname.includes("preview") ||
    // Check for localhost during development
    window.location.hostname === "localhost"

  return isV0Preview
}

// Check if the environment has restricted access that would prevent Firebase from working
export function checkRestrictedAccess(): boolean {
  try {
    // Try to detect sandbox restrictions
    const testLocalStorage = () => {
      try {
        localStorage.setItem("firebase-test", "test")
        localStorage.removeItem("firebase-test")
        return false // No restriction
      } catch (e) {
        return true // Restricted
      }
    }

    // Check if we can make network requests
    const testNetworkAccess = () => {
      // This is a simple check - in a real implementation you might want to
      // actually try a fetch with a timeout
      return typeof fetch === "undefined"
    }

    return testLocalStorage() || testNetworkAccess()
  } catch (e) {
    // If any error occurs during detection, assume we're in a restricted environment
    return true
  }
}

// Utility to safely use Firebase with fallback
export function safeFirebase<T>(firebaseFunction: () => Promise<T>, fallbackValue: T): Promise<T> {
  if (isPreviewEnvironment()) {
    console.log("Using mock Firebase data in preview environment")
    return Promise.resolve(fallbackValue)
  }

  try {
    return firebaseFunction().catch((error) => {
      console.error("Firebase operation failed:", error)
      return fallbackValue
    })
  } catch (error) {
    console.error("Firebase operation failed:", error)
    return Promise.resolve(fallbackValue)
  }
}
