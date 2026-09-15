export type GiantSmokeCard = {
  id: string
  titleHints: string[]
  brief: string
  description: string
}

/** Locked Need you / Giant DeepCore smoke copy. Titles stay; brief + description carry the ask. */
export const GIANT_SMOKE_CARDS: GiantSmokeCard[] = [
  {
    id: "library",
    titleHints: ["library list", "library"],
    brief: "Open Library — see recent memories, not blank.",
    description:
      "On DeepCore Companion tip e9e831d: Open Library. Confirm you see your recent memories (at least a handful), not a blank list. Say PASS or what failed.",
  },
  {
    id: "sticky-ask",
    titleHints: ["sticky ask"],
    brief: "Today: Ask stays one row while you scroll.",
    description: "On Today, scroll the page. Ask must stay visible in one row (not scroll away, not a huge block). PASS or fail note.",
  },
  {
    id: "capture",
    titleHints: ["capture +", "capture+", "capture only", "bottom +"],
    brief: "Bottom + is Capture only — no second big circle.",
    description: "Bottom center + is Capture only. No second big circle fighting it.",
  },
  {
    id: "scope",
    titleHints: ["scope"],
    brief: "Mine / Team / Everything actually changes the list.",
    description: "Scope switch Mine / Team / Everything must change what you see.",
  },
  {
    id: "attribution",
    titleHints: ["attribution"],
    brief: "Shared memory shows who remembered it.",
    description: "On a shared memory, you can see who remembered it.",
  },
  {
    id: "share",
    titleHints: ["share default", "share"],
    brief: "New capture: Share defaults OFF.",
    description: "New capture defaults Share off (not auto-sharing to Team).",
  },
  {
    id: "passkey",
    titleHints: ["passkey escape", "passkey"],
    brief: "After saving a passkey, you can leave the screen.",
    description: "After saving a passkey, you can leave that screen (not stuck).",
  },
  {
    id: "voice-play-back",
    titleHints: ["voice play back", "voice playback", "play back"],
    brief: "Record → Play Back hears YOUR audio → Remember.",
    description: "Record a take, hit Play Back, hear your audio, then Remember.",
  },
  {
    id: "auto-face-id",
    titleHints: ["auto face id", "face id"],
    brief: "With Face ID lock on, open app → Face ID prompts itself.",
    description:
      "With Face ID lock on, opening the app prompts Face ID by itself — no Use Face ID tap first.",
  },
]

const LOCKED_BRIEFS = new Set(GIANT_SMOKE_CARDS.map((card) => card.brief))
const LOCKED_DESCRIPTIONS = new Set(GIANT_SMOKE_CARDS.map((card) => card.description))

const TITLE_PREFIX_RE = /^\s*(?:\[([^\]]+)\]|([^:–—\-/]+)\s*(?::|–|—|-|\/))\s*(.+)$/

function titleWithoutProjectPrefix(title: string) {
  const match = TITLE_PREFIX_RE.exec(title)
  return (match?.[3] || title).trim()
}

export function normalizeCardHaystack(title: string) {
  return titleWithoutProjectPrefix(title).replace(/\s+/g, " ").toLowerCase()
}

export function matchGiantSmokeCard(title: string): GiantSmokeCard | null {
  const hay = normalizeCardHaystack(title)
  const full = title.trim().replace(/\s+/g, " ").toLowerCase()
  for (const card of GIANT_SMOKE_CARDS) {
    if (card.titleHints.some((hint) => hay.includes(hint) || full.includes(hint))) {
      return card
    }
  }
  return null
}

export function stripDescriptionMarkup(value: string | null | undefined) {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""

  try {
    const parsed = JSON.parse(trimmed) as unknown
    if (Array.isArray(parsed)) {
      return parsed
        .map((block) => {
          if (block && typeof block === "object" && "content" in block) {
            return String((block as { content?: unknown }).content ?? "")
          }
          return ""
        })
        .join(" ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    }
  } catch {
    // plain text or HTML
  }

  return trimmed
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

export function briefFromDescription(description: string | null | undefined, fallback = "") {
  const plain = stripDescriptionMarkup(description)
  if (!plain) return fallback
  const sentences = plain.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ")
  if (sentences.length <= 140) return sentences
  return `${sentences.slice(0, 137).trimEnd()}…`
}

export function cardFaceBrief(task: { brief?: string | null; description?: string | null }) {
  const brief = task.brief?.trim()
  if (brief) return brief
  return briefFromDescription(task.description)
}

export function descriptionLooksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

/** Safe value for the edit-task description field. Never throws. */
export function descriptionForEditor(description: string | null | undefined) {
  if (!description) return ""
  try {
    return stripDescriptionMarkup(description)
  } catch {
    return String(description)
  }
}

export function isLocalPreviewBoard(boardId: string | null | undefined) {
  return boardId === "preview"
}

export type SmokeBackfillPlan = {
  brief: string
  description: string
  labels: string[]
}

function labelsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  return left.every((label, index) => label === right[index])
}

/**
 * Fill locked Giant smoke copy without stomping a later custom edit.
 * Empty fields and previous locked copy are updated; unique descriptions stay.
 */
export function planGiantSmokeBackfill(task: {
  title: string
  brief?: string | null
  description?: string | null
  labels?: string[] | null
}): SmokeBackfillPlan | null {
  const smoke = matchGiantSmokeCard(task.title)
  if (!smoke) return null

  const labels = Array.from(
    new Set(["Giant", ...(task.labels ?? []).filter((label) => label && label !== "Giant")]),
  )
  const currentBrief = task.brief?.trim() ?? ""
  const currentDescription = task.description?.trim() ?? ""

  const nextBrief = !currentBrief || LOCKED_BRIEFS.has(currentBrief) ? smoke.brief : currentBrief
  const nextDescription =
    !currentDescription || LOCKED_DESCRIPTIONS.has(currentDescription) ? smoke.description : currentDescription

  if (
    nextBrief === (task.brief ?? "") &&
    nextDescription === (task.description ?? "") &&
    labelsEqual(labels, task.labels ?? [])
  ) {
    return null
  }

  return { brief: nextBrief, description: nextDescription, labels }
}
