import { Monitor } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { Button } from "@/components/ui/button"

export function ChatHeader({
  bot,
}: {
  bot: {
    id: string
    name: string
    avatar: string
    job: string
    instructions: string | null
  }
}) {
  return (
    <header className="flex h-10 items-center justify-between border-b border-white/10 bg-black px-5 text-white">
      <BotDialog key={bot.id} bot={bot} />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Desktop"
        className="text-white hover:bg-white/10 hover:text-white"
      >
        <Monitor />
      </Button>
    </header>
  )
}
