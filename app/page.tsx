import { auth } from "@clerk/nextjs/server"
import { randomUUID } from "node:crypto"

import { BotDialog } from "@/components/bot-dialog"
import { ChatAvatar } from "@/components/chat-avatar"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { connection } from "next/server"

export default async function Page() {
  await connection()
  await auth.protect()

  return (
    <main className="flex min-h-[calc(100svh-4rem)] p-6">
      <Empty className="gap-4 border-0 p-0">
        <EmptyHeader className="max-w-xl gap-3">
          <EmptyMedia className="mb-1">
            <ChatAvatar seed={randomUUID()} />
          </EmptyMedia>
          <EmptyTitle className="text-base tracking-normal">
            Meet your first bot
          </EmptyTitle>
          <EmptyDescription className="max-w-xl text-base/relaxed">
            Every bot gets its own personality, memory, and face. Spin one up
            and start the conversation.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="w-auto max-w-none">
          <BotDialog />
        </EmptyContent>
      </Empty>
    </main>
  )
}
