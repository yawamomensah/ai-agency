"use server"

import { auth } from "@clerk/nextjs/server"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { chat, defaultStorage } from "@trigger.dev/sdk/ai"
import { z } from "zod"

import { createDaytonaClient } from "@/lib/daytona"
import { PAID_PLAN_SLUG } from "@/lib/billing"
import { getChatById } from "@/queries/chats"

const chatIdSchema = z.string().trim().min(1).max(128)
const VNC_PORT = 6080
const startSession = chat.createStartSessionAction("chat-agent")
const loadTranscript = chat.createLoadTranscriptAction(defaultStorage)

async function requireChatAccess(input: unknown) {
  const result = chatIdSchema.safeParse(input)
  const authorizedChat = result.success ? await getChatById(result.data) : null

  if (!authorizedChat) {
    throw new Error("Chat not found")
  }

  return authorizedChat
}

async function requirePaidPlan() {
  const { userId, has } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  if (!has({ plan: PAID_PLAN_SLUG })) {
    throw new Error("A Pro plan is required to use bots and sandboxes.")
  }
}

export async function startChatSession({ chatId }: { chatId: string }) {
  const authorizedChat = await requireChatAccess(chatId)
  await requirePaidPlan()

  return startSession({ chatId: authorizedChat.id })
}

export async function mintChatAccessToken(chatId: string) {
  const authorizedChat = await requireChatAccess(chatId)
  await requirePaidPlan()

  return triggerAuth.createPublicToken({
    scopes: {
      read: { sessions: authorizedChat.id },
      write: { sessions: authorizedChat.id },
    },
    expirationTime: "1h",
  })
}

export async function loadChatTranscript({ chatId }: { chatId: string }) {
  const authorizedChat = await requireChatAccess(chatId)

  return loadTranscript({ chatId: authorizedChat.id })
}

export async function getSandboxVncUrl(chatId: string) {
  const chat = await requireChatAccess(chatId)
  const { userId, has } = await auth()

  if (!userId) {
    throw new Error("Unauthorized")
  }

  if (!has({ plan: PAID_PLAN_SLUG })) {
    return { success: false as const, upgradeRequired: true as const }
  }

  if (!chat.sandboxId) {
    throw new Error("This bot does not have an assigned Daytona sandbox.")
  }

  const daytona = createDaytonaClient()
  const sandbox = await daytona.get(chat.sandboxId)

  if (sandbox.state !== "started") {
    await sandbox.start(60)
  }

  const { status } = await sandbox.computerUse.getStatus()
  if (status !== "running") {
    await sandbox.computerUse.start()
  }

  const preview = await sandbox.getSignedPreviewUrl(VNC_PORT, 3600)
  const vncUrl = new URL("/vnc.html", preview.url)
  vncUrl.searchParams.set("autoconnect", "true")
  vncUrl.searchParams.set("resize", "scale")

  return { success: true as const, url: vncUrl.toString() }
}
