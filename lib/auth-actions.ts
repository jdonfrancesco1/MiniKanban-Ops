"use server"

import {
  clearOpsSessionCookie,
  isAuthGateEnabled,
  isOpsAuthenticated,
  setOpsSessionCookie,
  verifyOpsSecret,
} from "@/lib/auth/session"

export async function loginWithOpsSecret(secret: string) {
  if (isAuthGateEnabled() && !verifyOpsSecret(secret)) {
    return { success: false, error: "Invalid secret" }
  }
  await setOpsSessionCookie()
  return { success: true }
}

export async function logoutOpsSession() {
  await clearOpsSessionCookie()
  return { success: true }
}

export async function getOpsAuthState() {
  return {
    authenticated: await isOpsAuthenticated(),
    gateEnabled: isAuthGateEnabled(),
  }
}
