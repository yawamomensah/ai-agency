import { auth } from "@clerk/nextjs/server"
import { and, asc, eq } from "drizzle-orm"

import { bots, chatMembers, chats } from "@/db/schema"
import { getDb } from "@/lib/db"

export async function getChatById(chatId: string) {
  const { userId } = await auth()

  if (!userId) {
    return null
  }

  const chatRows = await getDb()
    .select({
      id: chats.id,
      kind: chats.kind,
      name: chats.name,
      botId: bots.id,
      botName: bots.name,
      botAvatar: bots.avatar,
      botJob: bots.job,
      botInstructions: bots.instructions,
      sandboxId: bots.sandboxId,
    })
    .from(chats)
    .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
    .innerJoin(
      bots,
      and(eq(bots.id, chatMembers.botId), eq(bots.userId, userId))
    )
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .orderBy(asc(chatMembers.joinedAt), asc(chatMembers.botId))

  const firstBot = chatRows[0]

  if (!firstBot) {
    return null
  }

  return {
    ...firstBot,
    bots: chatRows.map((row) => ({
      id: row.botId,
      name: row.botName,
      avatar: row.botAvatar,
      job: row.botJob,
      instructions: row.botInstructions,
      sandboxId: row.sandboxId,
    })),
  }
}
