import { auth } from "@clerk/nextjs/server"
import { google } from "@ai-sdk/google"
import { convertToModelMessages, streamText, type UIMessage } from "ai"

import { getChatById } from "@/queries/chats"

export const maxDuration = 30

export async function POST(
  request: Request,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { userId } = await auth()

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { chatId } = await params
  const chat = await getChatById(chatId)

  if (!chat) {
    return Response.json({ error: "Chat not found" }, { status: 404 })
  }

  const { messages }: { messages: UIMessage[] } = await request.json()
  const result = streamText({
    model: google("gemini-3.8-flash"),
    instructions:
      chat.botInstructions ?? `You are ${chat.botName}, a ${chat.botJob}.`,
    messages: await convertToModelMessages(messages),
  })

  return result.toUIMessageStreamResponse()
}
