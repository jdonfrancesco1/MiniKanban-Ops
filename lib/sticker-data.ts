// Define sticker types and interfaces
export interface Sticker {
  id: string
  name: string
  category: string
  url: string
  color: string
  isFree?: boolean
}

export type StickerItem = Sticker

// Task Status Stickers
export const taskStatusStickers: Sticker[] = [
  {
    id: "completed",
    name: "Completed",
    category: "task-status",
    url: "/stickers/task-status/completed.png",
    color: "#4cd964",
    isFree: true,
  },
  {
    id: "in-progress",
    name: "In Progress",
    category: "task-status",
    url: "/stickers/task-status/in-progress.png",
    color: "#af52de",
    isFree: true,
  },
  {
    id: "blocked",
    name: "Blocked",
    category: "task-status",
    url: "/stickers/task-status/blocked.png",
    color: "#ff3b30",
    isFree: true,
  },
  {
    id: "priority",
    name: "Priority",
    category: "task-status",
    url: "/stickers/task-status/priority.png",
    color: "#ff9500",
    isFree: true,
  },
  {
    id: "review",
    name: "Review",
    category: "task-status",
    url: "/stickers/task-status/review.png",
    color: "#5ac8fa",
    isFree: true,
  },
]

// Motivation Stickers
export const motivationStickers: Sticker[] = [
  {
    id: "great-job",
    name: "Great Job",
    category: "motivation",
    url: "/stickers/motivation/great-job.svg",
    color: "#a78bfa",
    isFree: true,
  },
  {
    id: "milestone",
    name: "Milestone",
    category: "motivation",
    url: "/stickers/motivation/milestone.svg",
    color: "#ec4899",
    isFree: true,
  },
  {
    id: "celebration",
    name: "Celebration",
    category: "motivation",
    url: "/stickers/motivation/celebration.svg",
    color: "#f59e0b",
    isFree: true,
  },
  {
    id: "rocket",
    name: "Rocket",
    category: "motivation",
    url: "/stickers/motivation/rocket.svg",
    color: "#3b82f6",
    isFree: true,
  },
  {
    id: "star",
    name: "Star",
    category: "motivation",
    url: "/stickers/motivation/star.svg",
    color: "#f59e0b",
    isFree: true,
  },
  {
    id: "trophy",
    name: "Trophy",
    category: "motivation",
    url: "/stickers/motivation/trophy.svg",
    color: "#f59e0b",
    isFree: true,
  },
  {
    id: "empower",
    name: "Empower",
    category: "motivation",
    url: "/stickers/motivation/empower.svg",
    color: "#a78bfa",
    isFree: false,
  },
]

// Team & Collaboration Stickers
export const teamStickers: Sticker[] = [
  {
    id: "team",
    name: "Team",
    category: "team",
    url: "/stickers/team/team.svg",
    color: "#3b82f6",
    isFree: true,
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    category: "team",
    url: "/stickers/team/brainstorm.svg",
    color: "#ec4899",
    isFree: true,
  },
  {
    id: "handshake",
    name: "Handshake",
    category: "team",
    url: "/stickers/team/handshake.svg",
    color: "#38bdf8",
    isFree: true,
  },
]

// Business Process Stickers
export const businessStickers: Sticker[] = [
  {
    id: "obsess",
    name: "Obsess",
    category: "business",
    url: "/stickers/business/obsess.svg",
    color: "#ec4899",
    isFree: false,
  },
  {
    id: "outcome",
    name: "Outcome",
    category: "business",
    url: "/stickers/business/outcome.svg",
    color: "#f59e0b",
    isFree: false,
  },
  {
    id: "iterate",
    name: "Iterate",
    category: "business",
    url: "/stickers/business/iterate.svg",
    color: "#10b981",
    isFree: false,
  },
  {
    id: "scrum",
    name: "Scrum",
    category: "business",
    url: "/stickers/business/scrum.svg",
    color: "#3b82f6",
    isFree: false,
  },
  {
    id: "innovate",
    name: "Innovate",
    category: "business",
    url: "/stickers/business/innovate.svg",
    color: "#8b5cf6",
    isFree: false,
  },
  {
    id: "validate",
    name: "Validate",
    category: "business",
    url: "/stickers/business/validate.svg",
    color: "#10b981",
    isFree: false,
  },
]

// Additional Business Stickers
export const additionalBusinessStickers: Sticker[] = [
  {
    id: "pivot",
    name: "Pivot",
    category: "business",
    url: "/stickers/business/pivot.svg",
    color: "#ef4444",
    isFree: false,
  },
  {
    id: "optimize",
    name: "Optimize",
    category: "business",
    url: "/stickers/business/optimize.svg",
    color: "#38bdf8",
    isFree: false,
  },
  {
    id: "focus",
    name: "Focus",
    category: "business",
    url: "/stickers/business/focus.svg",
    color: "#8b5cf6",
    isFree: false,
  },
]

// Get all stickers
export const getAllStickers = (): Sticker[] => {
  return [
    ...taskStatusStickers,
    ...motivationStickers,
    ...teamStickers,
    ...businessStickers,
    ...additionalBusinessStickers,
  ]
}

// Get free stickers only
export const getFreeStickers = (): Sticker[] => {
  return getAllStickers().filter((sticker) => sticker.isFree)
}

// Get stickers by category
export const getStickersByCategory = (category: string): Sticker[] => {
  return getAllStickers().filter((sticker) => sticker.category === category)
}

// Organize stickers by category for the panel
export const stickers = {
  "Task Status": taskStatusStickers,
  Motivation: motivationStickers,
  Team: teamStickers,
  Business: [...businessStickers, ...additionalBusinessStickers],
}
