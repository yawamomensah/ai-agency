"use server"

import { auth } from "@clerk/nextjs/server"
import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { customAlphabet } from "nanoid"
import { z } from "zod"

import { bots, chatMembers, chats, createGroupChatSchema } from "@/db/schema"
import { PAID_PLAN_SLUG } from "@/lib/billing"
import { getDb } from "@/lib/db"

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12)

export async function createGroupChat(input: unknown) {
  const { userId, has } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  const result = createGroupChatSchema.safeParse(input)

  if (!result.success) {
    return {
      success: false as const,
      error: "Please check the group chat details and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    }
  }

  if (!has({ plan: PAID_PLAN_SLUG })) {
    return {
      success: false as const,
      upgradeRequired: true as const,
      error: "Upgrade to Pro to use bots in group chats.",
    }
  }

  const { name, botIds } = result.data
  const db = getDb()
  const ownedBots = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.userId, userId), inArray(bots.id, botIds)))

  if (ownedBots.length !== botIds.length) {
    return {
      success: false as const,
      error: "One or more selected bots could not be found.",
      fieldErrors: { botIds: ["Choose bots from your account and try again."] },
    }
  }

  const chatId = nanoid()

  await db.batch([
    db.insert(chats).values({
      id: chatId,
      userId,
      kind: "group",
      name,
    }),
    db.insert(chatMembers).values(botIds.map((botId) => ({ chatId, botId }))),
  ])

  revalidatePath("/", "layout")

  return { success: true as const, chatId }
}

const groupChatIdSchema = z.string().trim().min(1).max(128)

export async function updateGroupChat(chatId: unknown, input: unknown) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  const parsedChatId = groupChatIdSchema.safeParse(chatId)
  if (!parsedChatId.success) {
    return {
      success: false as const,
      error: "This group chat could not be found.",
      fieldErrors: {},
    }
  }

  const result = createGroupChatSchema.safeParse(input)
  if (!result.success) {
    return {
      success: false as const,
      error: "Please check the group chat details and try again.",
      fieldErrors: result.error.flatten().fieldErrors,
    }
  }

  const db = getDb()
  const [groupChat] = await db
    .select({ id: chats.id })
    .from(chats)
    .where(
      and(
        eq(chats.id, parsedChatId.data),
        eq(chats.userId, userId),
        eq(chats.kind, "group")
      )
    )
    .limit(1)

  if (!groupChat) {
    return {
      success: false as const,
      error: "This group chat could not be found.",
      fieldErrors: {},
    }
  }

  const { name, botIds } = result.data
  const ownedBots = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.userId, userId), inArray(bots.id, botIds)))

  if (ownedBots.length !== botIds.length) {
    return {
      success: false as const,
      error: "One or more selected bots could not be found.",
      fieldErrors: { botIds: ["Choose bots from your account and try again."] },
    }
  }

  const currentMembers = await db
    .select({ botId: chatMembers.botId })
    .from(chatMembers)
    .where(eq(chatMembers.chatId, groupChat.id))
  const currentBotIds = new Set(currentMembers.map(({ botId }) => botId))
  const nextBotIds = new Set(botIds)
  const removedBotIds = [...currentBotIds].filter(
    (botId) => !nextBotIds.has(botId)
  )
  const addedBotIds = botIds.filter((botId) => !currentBotIds.has(botId))

  const statements = [
    db
      .update(chats)
      .set({ name })
      .where(
        and(
          eq(chats.id, groupChat.id),
          eq(chats.userId, userId),
          eq(chats.kind, "group")
        )
      ),
    ...(removedBotIds.length > 0
      ? ([
          db
            .delete(chatMembers)
            .where(
              and(
                eq(chatMembers.chatId, groupChat.id),
                inArray(chatMembers.botId, removedBotIds)
              )
            ),
        ] as const)
      : []),
    ...(addedBotIds.length > 0
      ? ([
          db
            .insert(chatMembers)
            .values(
              addedBotIds.map((botId) => ({ chatId: groupChat.id, botId }))
            ),
        ] as const)
      : []),
  ] as const

  await db.batch(statements)
  revalidatePath("/", "layout")
  revalidatePath(`/chats/${groupChat.id}`)

  return { success: true as const, chatId: groupChat.id }
}

export async function deleteGroupChat(chatId: unknown) {
  const { userId } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  const parsedChatId = groupChatIdSchema.safeParse(chatId)
  if (!parsedChatId.success) {
    return {
      success: false as const,
      error: "This group chat could not be found.",
    }
  }

  const [deletedChat] = await getDb()
    .delete(chats)
    .where(
      and(
        eq(chats.id, parsedChatId.data),
        eq(chats.userId, userId),
        eq(chats.kind, "group")
      )
    )
    .returning({ id: chats.id })

  if (!deletedChat) {
    return {
      success: false as const,
      error: "This group chat could not be found.",
    }
  }

  revalidatePath("/", "layout")

  return { success: true as const }
}
