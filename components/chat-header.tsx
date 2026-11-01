"use client"

import { Monitor } from "lucide-react"

import { BotDialog } from "@/components/bot-dialog"
import { GroupChatDialog } from "@/components/group-chat-dialog"
import { Button } from "@/components/ui/button"
import { useChatPanel } from "@/components/chat-panel"

export function ChatHeader({
  bot,
  group,
}: {
  bot?: {
    id: string
    name: string
    avatar: string
    job: string
    instructions: string | null
  }
  group?: {
    id: string
    name: string
    bots: { id: string; name: string; avatar: string; job: string }[]
    availableBots: { id: string; name: string; avatar: string; job: string }[]
  }
}) {
  return (
    <header className="flex h-10 items-center justify-between border-b border-white/10 bg-black px-5 text-white">
      {bot ? (
        <BotDialog key={bot.id} bot={bot} />
      ) : group ? (
        <GroupChatDialog
          chat={{ id: group.id, name: group.name, bots: group.bots }}
          bots={group.availableBots}
        />
      ) : null}
      {bot && <DesktopPanelButton />}
    </header>
  )
}

function DesktopPanelButton() {
  const { isOpen, togglePanel } = useChatPanel()

  return (
    <Button
      aria-expanded={isOpen}
      aria-label="Toggle desktop panel"
      onClick={togglePanel}
      type="button"
      variant="ghost"
      size="icon-sm"
      className="text-white hover:bg-white/10 hover:text-white"
    >
      <Monitor />
    </Button>
  )
}
