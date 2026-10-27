"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { customAlphabet } from "nanoid"

import { bots, chatMembers, chats, createBotSchema } from "@/db/schema"
import { getDb } from "@/lib/db"

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12)

export async function createBot(input: unknown) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  const result = createBotSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false as const,
      error: "Please check the bot details and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    }
  }

  const botId = nanoid()
  const chatId = nanoid()
  const db = getDb()

  await db.batch([
    db.insert(bots).values({
      ...result.data,
      id: botId,
      instructions: result.data.instructions?.trim() || null,
      userId,
    }),
    db.insert(chats).values({
      id: chatId,
      userId,
      kind: "direct",
    }),
    db.insert(chatMembers).values({ chatId, botId }),
  ])

  revalidatePath("/")

  return { success: true as const, botId, chatId }
}
