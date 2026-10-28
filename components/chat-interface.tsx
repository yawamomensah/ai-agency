"use client"

import { useChat } from "@ai-sdk/react"
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react"
import { MessageSquare } from "lucide-react"
import { useState } from "react"

import {
  loadChatTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message"
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import type { chatAgent } from "@/trigger/chat"

export function ChatInterface({ chatId }: { chatId: string }) {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat-agent",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId }) => startChatSession({ chatId }),
  })
  const {
    messages: initialMessages,
    isLoading,
    error: transcriptError,
  } = useLoadTranscript(chatId, loadChatTranscript, { transport })

  if (isLoading) {
    return null
  }

  if (transcriptError) {
    return (
      <section className="flex min-h-0 flex-1 items-start p-4">
        <p className="text-sm text-destructive" role="alert">
          Could not load this conversation. Please try again.
        </p>
      </section>
    )
  }

  return (
    <LoadedChatInterface
      chatId={chatId}
      initialMessages={initialMessages}
      transport={transport}
    />
  )
}

function LoadedChatInterface({
  chatId,
  initialMessages,
  transport,
}: {
  chatId: string
  initialMessages: ReturnType<typeof useLoadTranscript>["messages"]
  transport: ReturnType<typeof useTriggerChatTransport>
}) {
  const [input, setInput] = useState("")
  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    id: chatId,
    messages: initialMessages,
    resume: initialMessages.length > 0,
    transport,
  })

  const handleSubmit = (message: PromptInputMessage) => {
    if (
      !message.text.trim() ||
      status === "submitted" ||
      status === "streaming"
    ) {
      return
    }

    sendMessage({ text: message.text })
    setInput("")
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <Conversation className="min-h-0">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<MessageSquare className="size-8" />}
              title="Start a conversation"
              description="Send a message to begin chatting."
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent>
                  {message.parts.map((part, index) =>
                    part.type === "text" ? (
                      <MessageResponse key={`${message.id}-${index}`}>
                        {part.text}
                      </MessageResponse>
                    ) : null
                  )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="mx-auto w-full max-w-3xl p-4">
        {error && (
          <div className="mb-2 flex items-center justify-between text-sm text-destructive">
            <p role="alert">Something went wrong. Please try again.</p>
            <button
              className="underline underline-offset-4"
              onClick={() => regenerate()}
              type="button"
            >
              Retry
            </button>
          </div>
        )}
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            className="min-h-12"
            onChange={(event) => setInput(event.currentTarget.value)}
            placeholder="Message..."
            value={input}
          />
          <PromptInputSubmit
            disabled={
              !input.trim() && status !== "submitted" && status !== "streaming"
            }
            onStop={stop}
            status={status}
          />
        </PromptInput>
      </div>
    </section>
  )
}
