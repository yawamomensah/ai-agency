import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"

import { ChatHeader } from "@/components/chat-header"
import { ChatInterface } from "@/components/chat"
import { ChatPanelProvider, ChatSidePanel } from "@/components/chat-panel"
import { PAID_PLAN_SLUG } from "@/lib/billing"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { getUserBots } from "@/queries/bots"
import { getChatById } from "@/queries/chats"

export default async function Page({
  params,
}: {
  params: Promise<{ chatId: string }>
}) {
  await auth.protect()
  const { has } = await auth()
  const canUsePaidFeatures = has({ plan: PAID_PLAN_SLUG })

  const { chatId } = await params
  const chat = await getChatById(chatId)

  if (!chat) {
    notFound()
  }

  if (chat.kind === "group") {
    const availableBots = await getUserBots()

    return (
      <main className="flex h-dvh min-h-0 flex-col overflow-hidden">
        <ChatHeader
          canUsePaidFeatures={canUsePaidFeatures}
          group={{
            id: chat.id,
            name: chat.name ?? "Group chat",
            bots: chat.bots,
            availableBots,
          }}
        />
        <ChatInterface
          key={chat.id}
          chatId={chat.id}
          groupBots={chat.bots.map(({ id, name, avatar }) => ({
            id,
            name,
            avatar,
          }))}
        />
      </main>
    )
  }

  return (
    <main className="h-dvh min-h-0 overflow-hidden">
      <ChatPanelProvider>
        <ResizablePanelGroup
          className="min-h-0 overflow-hidden"
          orientation="horizontal"
        >
          <ResizablePanel defaultSize="100%" minSize="50%">
            <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
              <ChatHeader
                canUsePaidFeatures={canUsePaidFeatures}
                bot={{
                  id: chat.botId,
                  name: chat.botName,
                  avatar: chat.botAvatar,
                  job: chat.botJob,
                  instructions: chat.botInstructions,
                }}
              />
              <ChatInterface key={chat.id} chatId={chat.id} />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ChatSidePanel chatId={chat.id} key={chat.id} />
        </ResizablePanelGroup>
      </ChatPanelProvider>
    </main>
  )
}
