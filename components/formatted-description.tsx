"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronUp } from "lucide-react"
import { cn } from "@/lib/utils"

type FormattedDescriptionProps = {
  description: string
  collapsible?: boolean
  maxHeight?: number
  className?: string
  content?: string
}

export function FormattedDescription({
  description,
  collapsible = true,
  maxHeight = 150,
  className,
  content,
}: FormattedDescriptionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Use content prop if provided, otherwise use description
  const textToDisplay = content || description

  // If the description is empty, don't render anything
  if (!textToDisplay || textToDisplay.trim() === "") {
    return null
  }

  // Create a div with the HTML content
  return (
    <div className={cn("relative rounded-md overflow-visible", className)}>
      <div
        className={cn(
          "prose prose-sm max-w-none text-white/80",
          !isExpanded && collapsible && `max-h-[${maxHeight}px]`,
          !isExpanded && collapsible && "overflow-hidden",
        )}
      >
        <div dangerouslySetInnerHTML={{ __html: textToDisplay }} />
      </div>

      {/* Show fade effect and expand button if content is collapsible */}
      {collapsible && (
        <>
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          )}
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full justify-center text-xs text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Show More
              </>
            )}
          </Button>
        </>
      )}
    </div>
  )
}
