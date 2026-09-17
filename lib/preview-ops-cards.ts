import { GIANT_SMOKE_CARDS } from "./card-copy"
import type { Task } from "./types"

function titleCaseHint(hint: string) {
  return hint
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ")
}

export function buildOpsCardPreviewTasks(): Task[] {
  return [
    ...GIANT_SMOKE_CARDS.map((card, index) => ({
      id: card.id,
      title: `[Giant] ${titleCaseHint(card.titleHints[0])}`,
      brief: card.brief,
      description: card.description,
      labels: ["Giant"],
      columnId: "need-you",
      boardId: "preview",
      order: index,
      createdAt: "2026-09-14T16:00:00.000Z",
    })),
    {
      id: "paylyte",
      title: "[Paylyte] Wire x402 checkout",
      brief: "Confirm the live offering still charges over x402.",
      description: "Open the Paylyte live offering, complete a test buy over x402, and note PASS or the exact fail.",
      labels: ["Paylyte"],
      columnId: "need-you",
      boardId: "preview",
      order: 20,
      createdAt: "2026-09-14T16:00:00.000Z",
    },
    {
      id: "jimbo",
      title: "[Jimbo] Review Friday asks",
      brief: "Read each Need you card and mark PASS or fail.",
      description: "Open every Need you card. For each, do the ask in the description and reply PASS or a fail note.",
      labels: ["Jimbo"],
      columnId: "need-you",
      boardId: "preview",
      order: 21,
      createdAt: "2026-09-14T16:00:00.000Z",
    },
    {
      id: "maven",
      title: "[Maven] Paylyte X posts today",
      brief: "Draft and park the Paylyte X posts before publish.",
      description: "Write the Paylyte X posts and leave them on this Maven card before James/GO publish.",
      labels: ["Maven"],
      columnId: "need-you",
      boardId: "preview",
      order: 22,
      createdAt: "2026-09-14T16:00:00.000Z",
    },
    {
      id: "orca",
      title: "[Orca] MiniKanban worker secrets",
      brief: "Set worker secrets and verify cards on workers.dev.",
      description: "Put MiniKanban worker secrets in place and confirm cards render on workers.dev.",
      labels: ["Orca"],
      columnId: "need-you",
      boardId: "preview",
      order: 23,
      createdAt: "2026-09-14T16:00:00.000Z",
    },
    {
      id: "marketing",
      title: "[Marketing] Launch Friday note",
      brief: "Draft the Friday customer note and park it here.",
      description: "Write the Friday customer note and leave the draft on this card.",
      labels: ["Marketing"],
      columnId: "need-you",
      boardId: "preview",
      order: 24,
      createdAt: "2026-09-14T16:00:00.000Z",
    },
    {
      id: "security",
      title: "[Security] Rotate ops secrets",
      brief: "Rotate the ops board secret and confirm login still works.",
      description: "Rotate OPS_BOARD_SECRET and confirm James can still sign in.",
      labels: ["Security"],
      columnId: "need-you",
      boardId: "preview",
      order: 25,
      createdAt: "2026-09-14T16:00:00.000Z",
    },
    {
      id: "done-rotate",
      title: "[Security] Rotate last week's secret",
      brief: "Last week's ops secret rotation is finished.",
      description: "OPS_BOARD_SECRET was rotated and James can still sign in.",
      labels: ["Security"],
      columnId: "done",
      boardId: "preview",
      order: 26,
      createdAt: "2026-09-14T16:00:00.000Z",
      completedAt: "2026-09-15T16:00:00.000Z",
    },
  ]
}

export function previewColumnTitle(columnId: string) {
  return columnId === "done" ? "Done" : "Need you"
}
