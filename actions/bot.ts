"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"

import { bots, createBotSchema } from "@/db/schema"
import { getDb } from "@/lib/db"

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

  const [bot] = await getDb()
    .insert(bots)
    .values({
      ...result.data,
      instructions: result.data.instructions?.trim() || null,
      userId,
    })
    .returning({ id: bots.id })

  if (!bot) {
    throw new Error("The bot could not be created")
  }

  revalidatePath("/")

  return { success: true as const, botId: bot.id }
}
