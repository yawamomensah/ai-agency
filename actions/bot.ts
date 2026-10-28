"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { customAlphabet } from "nanoid"
import { z } from "zod"

import { bots, chatMembers, chats, createBotSchema } from "@/db/schema"
import { getDb } from "@/lib/db"

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12)
const botIdSchema = z.string().trim().min(1).max(128)

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

export async function updateBot(botId: unknown, input: unknown) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  const parsedBotId = botIdSchema.safeParse(botId)
  if (!parsedBotId.success) {
    return {
      success: false as const,
      error: "This bot could not be found.",
      fieldErrors: {},
    }
  }

  const result = createBotSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false as const,
      error: "Please check the bot details and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    }
  }

  const [updatedBot] = await getDb()
    .update(bots)
    .set({
      ...result.data,
      instructions: result.data.instructions?.trim() || null,
    })
    .where(and(eq(bots.id, parsedBotId.data), eq(bots.userId, userId)))
    .returning({ id: bots.id })

  if (!updatedBot) {
    return {
      success: false as const,
      error: "This bot could not be found.",
      fieldErrors: {},
    }
  }

  revalidatePath("/", "layout")

  return { success: true as const }
}

export async function deleteBot(botId: unknown) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  const parsedBotId = botIdSchema.safeParse(botId)
  if (!parsedBotId.success) {
    return {
      success: false as const,
      error: "This bot could not be found.",
    }
  }

  const db = getDb()
  const [bot] = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.id, parsedBotId.data), eq(bots.userId, userId)))
    .limit(1)

  if (!bot) {
    return {
      success: false as const,
      error: "This bot could not be found.",
    }
  }

  await db.batch([
    db
      .delete(chats)
      .where(
        and(
          eq(chats.userId, userId),
          eq(chats.kind, "direct"),
          inArray(
            chats.id,
            db
              .select({ id: chatMembers.chatId })
              .from(chatMembers)
              .where(eq(chatMembers.botId, parsedBotId.data))
          )
        )
      ),
    db
      .delete(bots)
      .where(and(eq(bots.id, parsedBotId.data), eq(bots.userId, userId))),
  ])

  revalidatePath("/", "layout")

  return { success: true as const }
}
