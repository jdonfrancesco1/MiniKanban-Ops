import { Check, X } from "lucide-react"
import type { ReactNode } from "react"

type PricingFeatureProps = {
  children: ReactNode
  included?: boolean
}

export function PricingFeature({ children, included = false }: PricingFeatureProps) {
  return (
    <li className="flex items-center gap-2">
      {included ? (
        <Check className="h-4 w-4 text-pink-400 flex-shrink-0" />
      ) : (
        <X className="h-4 w-4 text-white/30 flex-shrink-0" />
      )}
      <span className={included ? "text-white" : "text-white/50"}>{children}</span>
    </li>
  )
}
