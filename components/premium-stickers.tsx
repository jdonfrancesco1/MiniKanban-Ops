"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function PremiumStickers() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Update the categories array to include a "Free" category
  const categories = [
    { id: "all", name: "All Stickers" },
    { id: "free", name: "Free" },
    { id: "status", name: "Task Status" },
    { id: "motivation", name: "Motivation" },
    { id: "team", name: "Team & Collaboration" },
    { id: "business", name: "Business" },
    { id: "communication", name: "Communication" },
    { id: "events", name: "Events" },
  ]

  // Update the stickers array to mark 10 stickers as free
  // I'll modify the sticker objects to include multiple categories where needed
  const stickers = [
    // Task Status Stickers
    { id: 1, name: "Completed", category: ["status", "free"], svg: <CompletedSticker /> },
    { id: 2, name: "In Progress", category: ["status", "free"], svg: <InProgressSticker /> },
    { id: 3, name: "Blocked", category: "status", svg: <BlockedSticker /> },
    { id: 4, name: "Priority", category: "status", svg: <PrioritySticker /> },
    { id: 5, name: "Review", category: "status", svg: <ReviewSticker /> },

    // Motivation Stickers
    { id: 6, name: "Great Job", category: "motivation", svg: <GreatJobSticker /> },
    { id: 7, name: "Milestone", category: "motivation", svg: <MilestoneSticker /> },
    { id: 8, name: "Celebration", category: "motivation", svg: <CelebrationSticker /> },
    { id: 9, name: "Rocket", category: "motivation", svg: <RocketSticker /> },
    { id: 10, name: "Star", category: ["motivation", "free"], svg: <StarSticker /> },
    { id: 11, name: "Trophy", category: "motivation", svg: <TrophySticker /> },
    // Add these 10 new stickers to the stickers array after the existing motivation stickers (after id: 11)

    // Add after the Trophy sticker (id: 11)
    { id: 41, name: "Empower", category: "motivation", svg: <EmpowerSticker /> },
    { id: 42, name: "Obsess", category: "motivation", svg: <ObsessSticker /> },
    { id: 43, name: "Outcome", category: "motivation", svg: <OutcomeSticker /> },
    { id: 44, name: "Iterate", category: "motivation", svg: <IterateSticker /> },
    { id: 45, name: "Scrum", category: "motivation", svg: <ScrumSticker /> },
    { id: 46, name: "Innovate", category: "motivation", svg: <InnovateSticker /> },
    { id: 47, name: "Validate", category: "motivation", svg: <ValidateSticker /> },
    { id: 48, name: "Pivot", category: "motivation", svg: <PivotSticker /> },
    { id: 49, name: "Optimize", category: "motivation", svg: <OptimizeSticker /> },
    { id: 50, name: "Focus", category: "motivation", svg: <FocusSticker /> },

    // Team & Collaboration Stickers
    { id: 12, name: "Team", category: ["team", "free"], svg: <TeamSticker /> },
    { id: 13, name: "Brainstorm", category: "team", svg: <BrainstormSticker /> },
    { id: 14, name: "Handshake", category: "team", svg: <HandshakeSticker /> },
    { id: 15, name: "Teamwork", category: "team", svg: <TeamworkSticker /> },
    { id: 16, name: "Meeting", category: ["team", "free"], svg: <MeetingSticker /> },
    { id: 17, name: "Collaboration", category: "team", svg: <CollaborationSticker /> },

    // Business Stickers
    { id: 18, name: "Growth", category: "business", svg: <GrowthSticker /> },
    { id: 19, name: "Idea", category: ["business", "free"], svg: <IdeaSticker /> },
    { id: 20, name: "Target", category: "business", svg: <TargetSticker /> },
    { id: 21, name: "Innovation", category: "business", svg: <InnovationSticker /> },
    { id: 22, name: "Launch", category: "business", svg: <LaunchSticker /> },
    { id: 23, name: "Analytics", category: "business", svg: <AnalyticsSticker /> },

    // Communication Stickers
    { id: 24, name: "Chat", category: "communication", svg: <ChatSticker /> },
    { id: 25, name: "Feedback", category: "communication", svg: <FeedbackSticker /> },
    { id: 26, name: "Announcement", category: "communication", svg: <AnnouncementSticker /> },
    { id: 27, name: "Question", category: "communication", svg: <QuestionSticker /> },
    { id: 28, name: "Important", category: ["communication", "free"], svg: <ImportantSticker /> },
    { id: 29, name: "Note", category: ["communication", "free"], svg: <NoteSticker /> },
    { id: 30, name: "Reminder", category: "communication", svg: <ReminderSticker /> },

    // Events Stickers
    { id: 31, name: "Deadline", category: ["events", "free"], svg: <DeadlineSticker /> },
    { id: 32, name: "Meeting", category: "events", svg: <EventMeetingSticker /> },
    { id: 33, name: "Workshop", category: "events", svg: <WorkshopSticker /> },
    { id: 34, name: "Conference", category: "events", svg: <ConferenceSticker /> },
    { id: 35, name: "Launch Day", category: ["events", "free"], svg: <LaunchDaySticker /> },
    { id: 36, name: "Sprint", category: "events", svg: <SprintSticker /> },
    { id: 37, name: "Hackathon", category: "events", svg: <HackathonSticker /> },
    { id: 38, name: "Demo Day", category: "events", svg: <DemoDaySticker /> },
    { id: 39, name: "Webinar", category: "events", svg: <WebinarSticker /> },
    { id: 40, name: "Milestone", category: "events", svg: <EventMilestoneSticker /> },
  ]

  // Update the filtering logic to handle arrays of categories
  const filteredStickers =
    selectedCategory === "all"
      ? stickers
      : stickers.filter((sticker) => {
          if (Array.isArray(sticker.category)) {
            return sticker.category.includes(selectedCategory)
          }
          return sticker.category === selectedCategory
        })

  return (
    <div className="w-full">
      <div className="mb-6 overflow-x-auto pb-2">
        <div className="flex gap-2">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              className={
                selectedCategory === category.id
                  ? "bg-pink-500 hover:bg-pink-600"
                  : "border-white/20 text-white hover:bg-white/10"
              }
              onClick={() => setSelectedCategory(category.id)}
              size="sm"
            >
              {category.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredStickers.map((sticker) => (
          <div
            key={sticker.id}
            className="bg-[#2a1b3e] rounded-lg p-4 flex flex-col items-center gap-2 border border-white/10 hover:border-pink-500/50 transition-all hover:shadow-lg hover:shadow-pink-500/10"
          >
            <div className="w-16 h-16 flex items-center justify-center">{sticker.svg}</div>
            <span className="text-sm text-white/80 text-center">{sticker.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Task Status Stickers
export function CompletedSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#4ade80" />
      <path d="M16 24L21 29L32 18" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function InProgressSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#e879f9" />
      <path d="M24 14V24L30 30" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function BlockedSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f43f5e" />
      <path d="M16 16L32 32M16 32L32 16" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PrioritySticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#fb923c" />
      <path d="M24 14V26M24 34V34.01" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ReviewSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#60a5fa" />
      <path
        d="M18 24H30M18 18H30M18 30H24"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Motivation Stickers
export function GreatJobSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#8b5cf6" />
      <path
        d="M24 14L26.5 19.5L32.5 20.25L28.25 24.5L29.5 30.5L24 27.5L18.5 30.5L19.75 24.5L15.5 20.25L21.5 19.5L24 14Z"
        fill="#d8b4fe"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MilestoneSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f472b6" />
      <path d="M24 14V34M16 24H32" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="6" fill="#fda4af" stroke="white" strokeWidth="2" />
    </svg>
  )
}

export function CelebrationSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#fbbf24" />
      <path d="M24 18V30M18 24H30" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M16 16L18 18M32 16L30 18M16 32L18 30M32 32L30 30"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function RocketSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#3b82f6" />
      <path d="M24 14C24 14 30 18 30 24C30 30 24 34 24 34" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 14C24 14 18 18 18 24C18 30 24 34 24 34" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 14L24 34" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M20 30L18 34M28 30L30 34" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M24 14C26.2091 14 28 15.7909 28 18C28 20.2091 26.2091 22 24 22C21.7909 22 20 20.2091 20 18C20 15.7909 21.7909 14 24 14Z"
        fill="#93c5fd"
        stroke="white"
        strokeWidth="1.5"
      />
      <path d="M20 26H28" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function StarSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#fbbf24" />
      <path
        d="M24 14L27.09 20.26L34 21.27L29 26.14L30.18 33.02L24 29.77L17.82 33.02L19 26.14L14 21.27L20.91 20.26L24 14Z"
        fill="#fef08a"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TrophySticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f59e0b" />
      <path
        d="M18 18H30M18 18V26C18 28.2091 20.6863 30 24 30C27.3137 30 30 28.2091 30 26V18M18 18H16V22C16 23.1046 17 24 18 24M30 18H32V22C32 23.1046 31 24 30 24M24 30V34M20 34H28"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Team & Collaboration Stickers
export function TeamSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#6366f1" />
      <circle cx="24" cy="20" r="4" stroke="white" strokeWidth="2" />
      <circle cx="16" cy="24" r="3" stroke="white" strokeWidth="2" />
      <circle cx="32" cy="24" r="3" stroke="white" strokeWidth="2" />
      <path d="M24 24V32M16 27V32M32 27V32" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function BrainstormSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#ec4899" />
      <path
        d="M24 16V18M24 30V32M16 24H18M30 24H32M18 18L20 20M28 28L30 30M28 18L26 20M18 28L20 26"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="6" stroke="white" strokeWidth="2" />
    </svg>
  )
}

export function HandshakeSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#0ea5e9" />
      <path
        d="M16 24L20 20M32 24L28 20M20 20L24 16L28 20M20 20L24 24L28 20"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 28L20 32L24 28L28 32L32 28"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TeamworkSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#8b5cf6" />
      <circle cx="18" cy="20" r="3" stroke="white" strokeWidth="2" />
      <circle cx="30" cy="20" r="3" stroke="white" strokeWidth="2" />
      <path
        d="M24 24C20 24 18 22 18 22V28C18 30 20 32 24 32C28 32 30 30 30 28V22C30 22 28 24 24 24Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MeetingSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f43f5e" />
      <rect x="16" y="18" width="16" height="12" rx="2" stroke="white" strokeWidth="2" />
      <path d="M20 22H28M20 26H24" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 14V18M18 30L16 34M30 30L32 34" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function CollaborationSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#0d9488" />
      <circle cx="18" cy="18" r="4" stroke="white" strokeWidth="2" />
      <circle cx="30" cy="30" r="4" stroke="white" strokeWidth="2" />
      <path d="M22 18H32M16 30H26M24 22L24 26" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

// Business Stickers
export function GrowthSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#10b981" />
      <path d="M16 32V24M24 32V20M32 32V16" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path
        d="M14 26L16 24L18 26M22 22L24 20L26 22M30 18L32 16L34 18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IdeaSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#fbbf24" />
      <path
        d="M24 16V17M24 31V32M16 24H17M31 24H32M18.5 18.5L19.5 19.5M29.5 29.5L30.5 30.5M29.5 18.5L28.5 19.5M18.5 29.5L19.5 28.5"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="24" r="5" stroke="white" strokeWidth="2" />
    </svg>
  )
}

export function TargetSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f43f5e" />
      <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="2" />
      <circle cx="24" cy="24" r="5" stroke="white" strokeWidth="2" />
      <circle cx="24" cy="24" r="2" fill="white" />
      <path d="M24 14V16M24 32V34M14 24H16M32 24H34" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function InnovationSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#6366f1" />
      <path d="M24 16V20M24 28V32M16 24H20M28 24H32" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="24" r="4" fill="#a5b4fc" stroke="white" strokeWidth="2" />
    </svg>
  )
}

export function LaunchSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#0ea5e9" />
      <path
        d="M24 32V20M24 20L18 26M24 20L30 26"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M18 16H30" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function AnalyticsSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#8b5cf6" />
      <path
        d="M16 32V24M24 32V16M32 32V20"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Communication Stickers
export function ChatSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#ec4899" />
      <path
        d="M16 18H32C33.1046 18 34 18.8954 34 20V28C34 29.1046 33.1046 30 32 30H24L18 34V30H16C14.8954 30 14 29.1046 14 28V20C14 18.8954 14.8954 18 16 18Z"
        stroke="white"
        strokeWidth="2"
      />
      <path d="M20 22H28M20 26H24" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function FeedbackSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#0ea5e9" />
      <path
        d="M18 22C19.1046 22 20 21.1046 20 20C20 18.8954 19.1046 18 18 18C16.8954 18 16 18.8954 16 20C16 21.1046 16.8954 22 18 22Z"
        fill="white"
      />
      <path
        d="M24 28C25.1046 28 26 27.1046 26 26C26 24.8954 25.1046 24 24 24C22.8954 24 22 24.8954 22 26C22 27.1046 22.8954 28 24 28Z"
        fill="white"
      />
      <path
        d="M30 34C31.1046 34 32 33.1046 32 32C32 30.8954 31.1046 30 30 30C28.8954 30 28 30.8954 28 32C28 33.1046 28.8954 34 30 34Z"
        fill="white"
      />
      <path d="M16 32L28 26M22 20L30 24" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function AnnouncementSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f59e0b" />
      <path
        d="M32 20V28M16 24H28M28 24C28 20 30 18 32 18M28 24C28 28 30 30 32 30"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 20V28C16 28 20 30 24 28V20C20 18 16 20 16 20Z"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function QuestionSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#8b5cf6" />
      <path
        d="M24 32V32.01M20 20C20 18 22 16 24 16C26 16 28 18 28 20C28 22 26 23 24 24C24 24 24 26 24 28"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ImportantSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f43f5e" />
      <path d="M24 16V26M24 32V32.01" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function NoteSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#0d9488" />
      <path
        d="M18 18H30M18 24H30M18 30H24"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ReminderSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f97316" />
      <circle cx="24" cy="24" r="8" stroke="white" strokeWidth="2" />
      <path d="M24 20V24L26 26" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M32 16L30 18M16 16L18 18M16 32L18 30M32 32L30 30"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Events Stickers
export function DeadlineSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#ef4444" />
      <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="2" />
      <path d="M24 18V24L28 28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 14L16 16M30 14L32 16M14 30L16 32M34 30L32 32" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function EventMeetingSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#0ea5e9" />
      <rect x="16" y="16" width="16" height="16" rx="2" stroke="white" strokeWidth="2" />
      <path d="M16 20H32" stroke="white" strokeWidth="2" />
      <path d="M20 14V18" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 14V18" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="24" r="1.5" fill="white" />
      <circle cx="27" cy="24" r="1.5" fill="white" />
      <circle cx="21" cy="29" r="1.5" fill="white" />
      <circle cx="27" cy="29" r="1.5" fill="white" />
    </svg>
  )
}

export function WorkshopSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#8b5cf6" />
      <path
        d="M18 20C19.1046 20 20 19.1046 20 18C20 16.8954 19.1046 16 18 16C16.8954 16 16 16.8954 16 18C16 19.1046 16.8954 20 18 20Z"
        fill="white"
      />
      <path
        d="M30 20C31.1046 20 32 19.1046 32 18C32 16.8954 31.1046 16 30 16C28.8954 16 28 16.8954 28 18C28 19.1046 28.8954 20 30 20Z"
        fill="white"
      />
      <path
        d="M24 32C25.1046 32 26 31.1046 26 30C26 28.8954 25.1046 28 24 28C22.8954 28 22 28.8954 22 30C22 31.1046 22.8954 32 24 32Z"
        fill="white"
      />
      <path d="M18 20V24M30 20V24M18 24H30M24 24V28" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function ConferenceSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#ec4899" />
      <rect x="14" y="18" width="20" height="12" rx="2" stroke="white" strokeWidth="2" />
      <path
        d="M18 18V16C18 14.8954 18.8954 14 20 14H28C29.1046 14 30 14.8954 30 16V18"
        stroke="white"
        strokeWidth="2"
      />
      <path d="M24 30V34" stroke="white" strokeWidth="2" />
      <path d="M20 34H28" stroke="white" strokeWidth="2" />
      <path d="M18 22H30" stroke="white" strokeWidth="2" />
      <circle cx="19" cy="25" r="1" fill="white" />
      <circle cx="24" cy="25" r="1" fill="white" />
      <circle cx="29" cy="25" r="1" fill="white" />
    </svg>
  )
}

export function LaunchDaySticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f97316" />
      <path d="M24 14V18M24 30V34M14 24H18M30 24H34" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M24 30C27.3137 30 30 27.3137 30 24C30 20.6863 27.3137 18 24 18C20.6863 18 18 20.6863 18 24C18 27.3137 20.6863 30 24 30Z"
        stroke="white"
        strokeWidth="2"
      />
      <path
        d="M24 26C25.1046 26 26 25.1046 26 24C26 22.8954 25.1046 22 24 22C22.8954 22 22 22.8954 22 24C22 25.1046 22.8954 26 24 26Z"
        fill="white"
      />
    </svg>
  )
}

export function SprintSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#10b981" />
      <path d="M16 24H32" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 24L20 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 24L20 28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 24L28 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M32 24L28 28" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 16V32" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 16L20 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 16L28 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function HackathonSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#6366f1" />
      <path d="M18 18L30 30" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M30 18L18 30" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="18" cy="18" r="3" stroke="white" strokeWidth="2" />
      <circle cx="30" cy="18" r="3" stroke="white" strokeWidth="2" />
      <circle cx="18" cy="30" r="3" stroke="white" strokeWidth="2" />
      <circle cx="30" cy="30" r="3" stroke="white" strokeWidth="2" />
    </svg>
  )
}

export function DemoDaySticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#0d9488" />
      <rect x="16" y="16" width="16" height="12" rx="2" stroke="white" strokeWidth="2" />
      <path d="M20 28V32" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 28V32" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 32H30" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 22L26 22" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function WebinarSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f43f5e" />
      <rect x="14" y="18" width="20" height="12" rx="2" stroke="white" strokeWidth="2" />
      <path d="M22 22L26 24L22 26V22Z" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 16L34 32" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M34 16L14 32" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function EventMilestoneSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#fbbf24" />
      <path d="M24 14V34" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 18L30 18" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 24H32" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 30H30" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="18" r="2" fill="white" />
      <circle cx="24" cy="24" r="2" fill="white" />
      <circle cx="24" cy="30" r="2" fill="white" />
    </svg>
  )
}

// Now add the SVG components at the end of the file, after EventMilestoneSticker

// New Motivation Stickers
export function EmpowerSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#8b5cf6" />
      <path
        d="M24 16V32M18 22H30M16 28H32"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="16" r="3" fill="#d8b4fe" stroke="white" strokeWidth="1.5" />
      <circle cx="18" cy="22" r="2" fill="#d8b4fe" stroke="white" strokeWidth="1.5" />
      <circle cx="30" cy="22" r="2" fill="#d8b4fe" stroke="white" strokeWidth="1.5" />
      <circle cx="16" cy="28" r="2" fill="#d8b4fe" stroke="white" strokeWidth="1.5" />
      <circle cx="32" cy="28" r="2" fill="#d8b4fe" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

export function ObsessSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#ec4899" />
      <circle cx="24" cy="24" r="8" stroke="white" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="4" fill="#fbcfe8" stroke="white" strokeWidth="1.5" />
      <path
        d="M24 14V16M24 32V34M14 24H16M32 24H34M17 17L19 19M29 29L31 31M29 17L27 19M17 29L19 27"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function OutcomeSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f59e0b" />
      <path d="M16 32L24 24L32 32" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 24L24 16L32 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="16" r="3" fill="#fef3c7" stroke="white" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="3" fill="#fef3c7" stroke="white" strokeWidth="1.5" />
      <circle cx="24" cy="32" r="3" fill="#fef3c7" stroke="white" strokeWidth="1.5" />
    </svg>
  )
}

export function IterateSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#10b981" />
      <path
        d="M32 20C32 16.6863 28.4183 14 24 14C19.5817 14 16 16.6863 16 20"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M16 28C16 31.3137 19.5817 34 24 34C28.4183 34 32 31.3137 32 28"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M16 20V28M32 20V28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M16 20L13 17M16 20L19 17M32 28L29 31M32 28L35 31"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ScrumSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#3b82f6" />
      <circle cx="18" cy="18" r="4" stroke="white" strokeWidth="2" />
      <circle cx="30" cy="18" r="4" stroke="white" strokeWidth="2" />
      <circle cx="18" cy="30" r="4" stroke="white" strokeWidth="2" />
      <circle cx="30" cy="30" r="4" stroke="white" strokeWidth="2" />
      <path d="M18 22V26M30 22V26M22 18H26M22 30H26" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 22L26 26M22 26L26 22" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function InnovateSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#6366f1" />
      <path
        d="M24 16V18M24 30V32M16 24H18M30 24H32M18 18L20 20M28 28L30 30M28 18L26 20M18 28L20 26"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24 28C26.2091 28 28 26.2091 28 24C28 21.7909 26.2091 20 24 20C21.7909 20 20 21.7909 20 24C20 26.2091 21.7909 28 24 28Z"
        fill="#a5b4fc"
        stroke="white"
        strokeWidth="2"
      />
      <path
        d="M24 26C25.1046 26 26 25.1046 26 24C26 22.8954 25.1046 22 24 22C22.8954 22 22 22.8954 22 24C22 25.1046 22.8954 26 24 26Z"
        fill="white"
      />
    </svg>
  )
}

export function ValidateSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#0d9488" />
      <rect x="16" y="16" width="16" height="16" rx="2" stroke="white" strokeWidth="2" />
      <path d="M19 24L22 27L29 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 16L32 18M34 32L32 30" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M36 24H34" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function PivotSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#f43f5e" />
      <circle cx="24" cy="24" r="6" stroke="white" strokeWidth="2.5" />
      <path d="M24 14V18M24 30V34M14 24H18M30 24H34" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M18 18L21 21M30 18L27 21M18 30L21 27M30 30L27 27"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function OptimizeSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#0ea5e9" />
      <path
        d="M16 32V26M24 32V22M32 32V18"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 26L19 23L24 28L29 23L32 18"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="26" r="2" fill="#bae6fd" stroke="white" strokeWidth="1" />
      <circle cx="24" cy="22" r="2" fill="#bae6fd" stroke="white" strokeWidth="1" />
      <circle cx="32" cy="18" r="2" fill="#bae6fd" stroke="white" strokeWidth="1" />
    </svg>
  )
}

export function FocusSticker() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#8b5cf6" />
      <circle cx="24" cy="24" r="10" stroke="white" strokeWidth="3" />
      <circle cx="24" cy="24" r="5" fill="#c4b5fd" stroke="white" strokeWidth="2" />
      <path
        d="M16 16L18 18M32 16L30 18M16 32L18 30M32 32L30 30"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
