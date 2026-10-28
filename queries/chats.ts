import { auth } from "@clerk/nextjs/server"
import { and, asc, eq } from "drizzle-orm"

import { bots, chatMembers, chats } from "@/db/schema"
import { getDb } from "@/lib/db"

export async function getChatById(chatId: string) {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const [chat] = await getDb()
    .select({
      id: chats.id,
      botId: bots.id,
      botName: bots.name,
      botAvatar: bots.avatar,
      botJob: bots.job,
      botInstructions: bots.instructions,
    })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .innerJoin(
      bots,
      and(eq(bots.id, chatMembers.botId), eq(bots.userId, userId))
    )
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .orderBy(asc(chatMembers.joinedAt), asc(chatMembers.botId))
    .limit(1)

  return chat ?? null
}
