"use server"

import { auth as triggerAuth } from "@trigger.dev/sdk"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"
import { z } from "zod"

import { getChatById } from "@/queries/chats"

const chatIdSchema = z.string().trim().min(1).max(128)
const startSession = chat.createStartSessionAction("chat-agent")
const loadTranscript = chat.createLoadTranscriptAction(defaultStorage)

async function requireChatAccess(input: unknown) {
  const result = chatIdSchema.safeParse(input)

  if (!result.success || !(await getChatById(result.data))) {
    throw new Error("Chat not found")
  }

  return result.data
}

export async function startChatSession({ chatId }: { chatId: string }) {
  const authorizedChatId = await requireChatAccess(chatId)

  return startSession({ chatId: authorizedChatId })
}

export async function mintChatAccessToken(chatId: string) {
  const authorizedChatId = await requireChatAccess(chatId)

  return triggerAuth.createPublicToken({
    scopes: {
      read: { sessions: authorizedChatId },
      write: { sessions: authorizedChatId },
    },
    expirationTime: "1h",
  })
}

export async function loadChatTranscript({ chatId }: { chatId: string }) {
  const authorizedChatId = await requireChatAccess(chatId)

  return loadTranscript({ chatId: authorizedChatId })
}
