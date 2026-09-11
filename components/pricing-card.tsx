import type { ReactNode } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

type PricingCardProps = {
  title: string
  description: string
  price: string
  period: string
  buttonText: string
  buttonLink: string
  buttonVariant: "default" | "outline"
  highlighted?: boolean
  children: ReactNode
}

export function PricingCard({
  title,
  description,
  price,
  period,
  buttonText,
  buttonLink,
  buttonVariant,
  highlighted = false,
  children,
}: PricingCardProps) {
  return (
    <div
      className={`relative rounded-xl border ${highlighted ? "border-pink-500/50 shadow-lg shadow-pink-500/10" : "border-white/10"} overflow-hidden`}
    >
      {highlighted && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400"></div>
      )}

      <div className={`p-6 md:p-8 ${highlighted ? "bg-[#3a2b4e]/50" : "bg-[#2a1b3e]"}`}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">{title}</h2>
          <p className="text-white/70">{description}</p>
        </div>

        <div className="mb-6">
          <div className="flex items-baseline">
            <span className="text-4xl font-bold text-white">{price}</span>
            <span className="ml-2 text-white/70">{period}</span>
          </div>
        </div>

        <Button
          className={`w-full ${highlighted ? "bg-pink-500 hover:bg-pink-600 text-white" : ""}`}
          variant={buttonVariant}
          size="lg"
          asChild
        >
          <Link href={buttonLink}>{buttonText}</Link>
        </Button>
      </div>

      <div className="p-6 md:p-8 border-t border-white/10 bg-[#2a1b3e]/50">{children}</div>
    </div>
  )
}
