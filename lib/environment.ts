export function isPreviewEnvironment(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.location.hostname.includes("v0.dev") ||
    window.location.hostname.includes("preview") ||
    window.location.hostname === "localhost"
  )
}

export function checkRestrictedAccess(): boolean {
  try {
    localStorage.setItem("ops-test", "test")
    localStorage.removeItem("ops-test")
    return typeof fetch === "undefined"
  } catch {
    return true
  }
}
