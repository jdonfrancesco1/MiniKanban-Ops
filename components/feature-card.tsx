import {
  Phone,
  LinkIcon,
  Users,
  MessageSquare,
  Shield,
  Tag,
  Smile,
  Image,
  Bell,
  Sparkles,
  Share2,
  RefreshCw,
} from "lucide-react"

type FeatureCardProps = {
  icon: string
  title: string
  description: string
  large?: boolean
}

export function FeatureCard({ icon, title, description, large = false }: FeatureCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "phone":
        return <Phone className="h-6 w-6 text-pink-400" />
      case "link":
        return <LinkIcon className="h-6 w-6 text-pink-400" />
      case "users":
        return <Users className="h-6 w-6 text-pink-400" />
      case "message-square":
        return <MessageSquare className="h-6 w-6 text-pink-400" />
      case "shield":
        return <Shield className="h-6 w-6 text-pink-400" />
      case "tag":
        return <Tag className="h-6 w-6 text-pink-400" />
      case "smile":
        return <Smile className="h-6 w-6 text-pink-400" />
      case "image":
        return <Image className="h-6 w-6 text-pink-400" />
      case "bell":
        return <Bell className="h-6 w-6 text-pink-400" />
      case "sparkles":
        return <Sparkles className="h-6 w-6 text-pink-400" />
      case "share":
        return <Share2 className="h-6 w-6 text-pink-400" />
      case "refresh":
        return <RefreshCw className="h-6 w-6 text-pink-400" />
      default:
        return <Sparkles className="h-6 w-6 text-pink-400" />
    }
  }

  return (
    <div
      className={`bg-[#3a2b4e]/50 backdrop-blur-sm rounded-xl border border-white/10 p-6 shadow-lg hover:shadow-pink-500/5 transition-all hover:border-pink-500/20 ${large ? "p-8" : ""}`}
    >
      <div className="flex items-start gap-4">
        <div className="bg-[#2a1b3e] p-3 rounded-lg border border-white/10">{getIcon()}</div>
        <div>
          <h3 className={`font-bold text-white ${large ? "text-xl mb-3" : "mb-2"}`}>{title}</h3>
          <p className="text-white/70">{description}</p>
        </div>
      </div>
    </div>
  )
}
