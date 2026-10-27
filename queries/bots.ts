import { auth } from "@clerk/nextjs/server"
import { formatDistanceToNowStrict } from "date-fns"
import { and, asc, desc, eq } from "drizzle-orm"

import { bots, chatMembers, chats } from "@/db/schema"
import { getDb } from "@/lib/db"

export async function getUserChats() {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  const db = getDb()
  const [fallbackBots, chatRows] = await Promise.all([
    db
      .select({
        name: bots.name,
        avatar: bots.avatar,
      })
      .from(bots)
      .where(eq(bots.userId, userId))
      .orderBy(asc(bots.createdAt), asc(bots.id))
      .limit(1),
    db
      .select({
        id: chats.id,
        name: chats.name,
        lastMessagePreview: chats.lastMessagePreview,
        lastMessageAt: chats.lastMessageAt,
        botName: bots.name,
        botAvatar: bots.avatar,
      })
      .from(chats)
      .leftJoin(
        chatMembers,
        and(eq(chatMembers.chatId, chats.id), eq(chats.kind, "direct"))
      )
      .leftJoin(
        bots,
        and(eq(bots.id, chatMembers.botId), eq(bots.userId, userId))
      )
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.lastMessageAt)),
  ])
  const fallbackBot = fallbackBots[0]
  const seenChatIds = new Set<string>()

  return chatRows.flatMap((chat) => {
    if (seenChatIds.has(chat.id)) {
      return []
    }

    seenChatIds.add(chat.id)

    const botName = chat.botName ?? fallbackBot?.name

    return [
      {
        id: chat.id,
        title: chat.name ?? botName ?? "New chat",
        avatarSeed: chat.botAvatar ?? fallbackBot?.avatar ?? chat.id,
        preview: chat.lastMessagePreview || "Start a conversation",
        lastMessageAt: chat.lastMessageAt.toISOString(),
        timeLabel: formatDistanceToNowStrict(chat.lastMessageAt),
      },
    ]
  })
}
