"use client"

import { useChat } from "@ai-sdk/react"
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react"
import type { InferChatUIMessage } from "@trigger.dev/sdk/chat/react"
import Image from "next/image"
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
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool"
import {
  PromptInput,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input"
import type { chatAgent } from "@/trigger/chat"

type ChatMessage = InferChatUIMessage<typeof chatAgent>
type ChatToolPart = Extract<
  ChatMessage["parts"][number],
  { type: "dynamic-tool" | `tool-${string}` }
>

const toolTitles: Record<string, string> = {
  "tool-bash": "Run command",
  "tool-keyboardPress": "Press key",
  "tool-keyboardType": "Type text",
  "tool-listFiles": "List files",
  "tool-mouseClick": "Click",
  "tool-mouseMove": "Move mouse",
  "tool-mouseScroll": "Scroll",
  "tool-readFile": "Read file",
  "tool-showScreen": "Show screen",
  "tool-viewScreen": "View screen",
  "tool-writeFile": "Write file",
}

function isToolPart(part: ChatMessage["parts"][number]): part is ChatToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-")
}

function renderToolPart(part: ChatToolPart, key: string) {
  if (part.type === "tool-viewScreen") {
    return null
  }

  const screenshot = part.type === "tool-showScreen" ? part.output : undefined

  return (
    <Tool
      key={key}
      defaultOpen={
        part.type === "tool-showScreen" || part.state === "input-available"
      }
    >
      <ToolHeader
        state={part.state}
        title={toolTitles[part.type] ?? part.type}
        type={part.type}
      />
      <ToolContent>
        <ToolInput input={part.input} />
        {screenshot ? (
          <div className="space-y-2">
            <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Screen
            </h4>
            <Image
              alt="Sandbox screen requested by the user"
              className="h-auto max-w-full rounded-md border"
              height={screenshot.height}
              src={`data:${screenshot.mediaType};base64,${screenshot.data}`}
              unoptimized
              width={screenshot.width}
            />
          </div>
        ) : (
          <ToolOutput errorText={part.errorText} output={part.output} />
        )}
      </ToolContent>
    </Tool>
  )
}

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
  initialMessages: ChatMessage[]
  transport: ReturnType<typeof useTriggerChatTransport>
}) {
  const [input, setInput] = useState("")
  const { messages, sendMessage, status, error, regenerate, stop } =
    useChat<ChatMessage>({
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
            messages.map((message) => {
              const visibleParts = message.parts.filter(
                (part) => part.type !== "tool-viewScreen"
              )

              if (visibleParts.length === 0) {
                return null
              }

              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent>
                    {visibleParts.map((part, index) =>
                      part.type === "text" ? (
                        <MessageResponse key={`${message.id}-${index}`}>
                          {part.text}
                        </MessageResponse>
                      ) : isToolPart(part) ? (
                        renderToolPart(part, `${message.id}-${index}`)
                      ) : null
                    )}
                  </MessageContent>
                </Message>
              )
            })
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
