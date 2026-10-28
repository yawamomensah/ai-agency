import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { ChatHeader } from "@/components/chat-header"
import { ChatInterface } from "@/components/chat-interface"
import { getChatById } from "@/queries/chats"

export default async function Page({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  await auth.protect()

  const { chatId } = await params
  const chat = await getChatById(chatId)

  if (!chat) {
    notFound()
  }

  return (
    <main className="flex h-dvh min-h-0 flex-col">
      <ChatHeader
        bot={{
          id: chat.botId,
          name: chat.botName,
          avatar: chat.botAvatar,
          job: chat.botJob,
          instructions: chat.botInstructions,
        }}
      />
      <ChatInterface key={chat.id} chatId={chat.id} />
    </main>
  )
}
