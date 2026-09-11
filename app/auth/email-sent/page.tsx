import { redirect } from "next/navigation"

export default function EmailSentPage() {
  redirect("/auth")
}
