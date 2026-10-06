import { stripDescriptionMarkup } from "./card-copy.ts"

/** Shown in the detail modal when a card has no real description. Not a valid stored ask. */
export const EMPTY_DESCRIPTION_PLACEHOLDER = "No description yet. Edit the card to add the full ask."

const PLACEHOLDER_TEXTS = new Set([
  EMPTY_DESCRIPTION_PLACEHOLDER.toLowerCase(),
  "no description yet.",
  "add a detailed description...",
  "add a detailed description",
])

export function descriptionIsMissing(value: string | null | undefined) {
  const plain = stripDescriptionMarkup(value).replace(/\s+/g, " ").trim().toLowerCase()
  if (!plain) return true
  return PLACEHOLDER_TEXTS.has(plain)
}

export function requireTaskDescription(value: string | null | undefined) {
  const raw = typeof value === "string" ? value.trim() : ""
  if (descriptionIsMissing(raw)) {
    throw new Error(
      "Description is required. Add the full ask — the empty placeholder is not a description.",
    )
  }
  return raw
}
