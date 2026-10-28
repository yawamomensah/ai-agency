import { google } from "@ai-sdk/google"
import { chat } from "@trigger.dev/sdk/ai"
import { and, asc, eq } from "drizzle-orm"

import { bots, chatMembers, chats } from "@/db/schema"
import { getDb } from "@/lib/db"

export const chatAgent = chat.agent({
  id: "chat-agent",
  run: async ({ chatId, messages, signal, streamText }) => {
    const [bot] = await getDb()
      .select({
        botName: bots.name,
        botJob: bots.job,
        botInstructions: bots.instructions,
      })
      .from(chats)
      .innerJoin(chatMembers, eq(chatMembers.chatId, chats.id))
      .innerJoin(
        bots,
        and(eq(bots.id, chatMembers.botId), eq(bots.userId, chats.userId))
      )
      .where(eq(chats.id, chatId))
      .orderBy(asc(chatMembers.joinedAt), asc(chatMembers.botId))
      .limit(1)

    if (!bot) {
      throw new Error("Chat not found")
    }

    return streamText({
      model: google("gemini-3.8-flash"),
      instructions:
        bot.botInstructions ?? `You are ${bot.botName}, a ${bot.botJob}.`,
      messages,
      abortSignal: signal,
    })
  },
})
