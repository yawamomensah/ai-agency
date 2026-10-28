"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import { MessageSquare } from "lucide-react"
import { useState } from "react"

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

export function ChatInterface({ chatId }: { chatId: string }) {
  const [input, setInput] = useState("")
  const { messages, sendMessage, status, error, regenerate, stop } = useChat({
    transport: new DefaultChatTransport({
      api: `/api/chats/${chatId}`,
    }),
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
