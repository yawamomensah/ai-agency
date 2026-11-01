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
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import { ChatAvatar } from "@/components/chat-avatar"
import { Badge } from "@/components/ui/badge"
import { SelectGroup } from "@/components/ui/select"
import type { chatAgent } from "@/trigger/chat"

type ChatMessage = InferChatUIMessage<typeof chatAgent>
type ChatToolPart = Extract<
  ChatMessage["parts"][number],
  { type: "dynamic-tool" | `tool-${string}` }
>

const toolTitles: Record<string, string> = {
  "tool-bash": "Run command",
  "tool-getMemory": "Read bot memory",
  "tool-handoff": "Hand off to bot",
  "tool-keyboardPress": "Press key",
  "tool-keyboardType": "Type text",
  "tool-listFiles": "List files",
  "tool-mouseClick": "Click",
  "tool-mouseMove": "Move mouse",
  "tool-mouseScroll": "Scroll",
  "tool-readFile": "Read file",
  "tool-showScreen": "Show screen",
  "tool-setMemory": "Update bot memory",
  "tool-viewScreen": "View screen",
  "tool-writeFile": "Write file",
}

function isToolPart(part: ChatMessage["parts"][number]): part is ChatToolPart {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-")
}

function getMessageBotId(message: ChatMessage) {
  const metadata = message.metadata

  return typeof metadata === "object" &&
    metadata !== null &&
    "botId" in metadata &&
    typeof metadata.botId === "string"
    ? metadata.botId
    : undefined
}

function isScreenshotOutput(output: unknown): output is {
  data: string
  height: number
  mediaType: string
  width: number
} {
  return (
    typeof output === "object" &&
    output !== null &&
    "data" in output &&
    typeof output.data === "string" &&
    "height" in output &&
    typeof output.height === "number" &&
    "mediaType" in output &&
    typeof output.mediaType === "string" &&
    "width" in output &&
    typeof output.width === "number"
  )
}

function getHandoffBotId(input: unknown) {
  return typeof input === "object" &&
    input !== null &&
    "botId" in input &&
    typeof input.botId === "string"
    ? input.botId
    : undefined
}

function getHandoffResponseText(output: unknown) {
  if (
    typeof output !== "object" ||
    output === null ||
    !("parts" in output) ||
    !Array.isArray(output.parts)
  ) {
    return undefined
  }

  const textParts = output.parts.filter(
    (part): part is { type: "text"; text: string } =>
      typeof part === "object" &&
      part !== null &&
      "type" in part &&
      part.type === "text" &&
      "text" in part &&
      typeof part.text === "string"
  )

  return textParts.length
    ? textParts.map((part) => part.text).join("\n")
    : undefined
}

function renderToolPart(
  part: ChatToolPart,
  key: string,
  groupBots?: ChatBot[]
) {
  if (part.type === "tool-viewScreen") {
    return null
  }

  const screenshot =
    part.type === "tool-showScreen" && isScreenshotOutput(part.output)
      ? part.output
      : undefined
  const handoffText =
    part.type === "tool-handoff"
      ? getHandoffResponseText(part.output)
      : undefined
  const handoffBot =
    part.type === "tool-handoff"
      ? groupBots?.find((bot) => bot.id === getHandoffBotId(part.input))
      : undefined

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
        ) : handoffText && !part.errorText ? (
          <div
            aria-label={`${handoffBot?.name ?? "Delegated bot"} response`}
            className="flex items-start gap-2"
            role="group"
          >
            {handoffBot && (
              <ChatAvatar
                className="mt-1 size-6 shrink-0"
                seed={handoffBot.avatar}
              />
            )}
            <MessageResponse>{handoffText}</MessageResponse>
          </div>
        ) : (
          <ToolOutput errorText={part.errorText} output={part.output} />
        )}
      </ToolContent>
    </Tool>
  )
}

type ChatBot = {
  id: string
  name: string
  avatar: string
}

export function ChatInterface({
  chatId,
  groupBots,
}: {
  chatId: string
  groupBots?: ChatBot[]
}) {
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
      groupBots={groupBots}
      initialMessages={initialMessages}
      transport={transport}
    />
  )
}

function LoadedChatInterface({
  chatId,
  groupBots,
  initialMessages,
  transport,
}: {
  chatId: string
  groupBots?: ChatBot[]
  initialMessages: ChatMessage[]
  transport: ReturnType<typeof useTriggerChatTransport>
}) {
  const [input, setInput] = useState("")
  const [selectedBotId, setSelectedBotId] = useState(groupBots?.[0]?.id ?? "")
  const selectedBot = groupBots?.find((bot) => bot.id === selectedBotId)
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

    if (groupBots?.length) {
      const metadata = { botId: selectedBotId }
      sendMessage({ text: message.text, metadata }, { metadata })
    } else {
      sendMessage({ text: message.text })
    }
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
            messages.map((message, messageIndex) => {
              const visibleParts = message.parts.filter(
                (part) => part.type !== "tool-viewScreen"
              )

              if (visibleParts.length === 0) {
                return null
              }

              const lastUserMessage = messages
                .slice(0, messageIndex + 1)
                .findLast((candidate) => candidate.role === "user")
              const messageBot =
                groupBots?.find(
                  (bot) =>
                    bot.id ===
                    (message.role === "user"
                      ? getMessageBotId(message)
                      : lastUserMessage
                        ? getMessageBotId(lastUserMessage)
                        : undefined)
                ) ??
                groupBots?.find((bot) => bot.id === selectedBotId) ??
                (groupBots?.length === 1 ? groupBots[0] : undefined)

              const content = visibleParts.map((part, index) =>
                part.type === "text" ? (
                  <MessageResponse key={`${message.id}-${index}`}>
                    {part.text}
                  </MessageResponse>
                ) : isToolPart(part) ? (
                  renderToolPart(part, `${message.id}-${index}`, groupBots)
                ) : null
              )

              return (
                <Message from={message.role} key={message.id}>
                  {message.role === "assistant" && groupBots?.length ? (
                    <div
                      aria-label={`${messageBot?.name ?? "Bot"} response`}
                      className="flex min-w-0 items-start gap-2"
                      role="group"
                    >
                      {messageBot && (
                        <ChatAvatar
                          className="mt-1 size-8 shrink-0"
                          seed={messageBot.avatar}
                        />
                      )}
                      <MessageContent className="min-w-0 flex-1">
                        {content}
                      </MessageContent>
                    </div>
                  ) : message.role === "user" && groupBots?.length ? (
                    <MessageContent>
                      {visibleParts.map((part, index) => {
                        if (part.type === "text") {
                          return (
                            <div
                              className="flex min-w-0 items-start gap-1"
                              key={`${message.id}-${index}`}
                            >
                              {messageBot && (
                                <Badge
                                  className="mt-0.5 h-5 max-w-36 gap-1 rounded-full px-1.5"
                                  variant="secondary"
                                >
                                  <ChatAvatar
                                    className="size-3.5 shrink-0"
                                    seed={messageBot.avatar}
                                  />
                                  <span className="min-w-0 truncate">
                                    {messageBot.name}
                                  </span>
                                </Badge>
                              )}
                              <MessageResponse className="min-w-0 flex-1">
                                {part.text}
                              </MessageResponse>
                            </div>
                          )
                        }

                        return isToolPart(part)
                          ? renderToolPart(
                              part,
                              `${message.id}-${index}`,
                              groupBots
                            )
                          : null
                      })}
                    </MessageContent>
                  ) : (
                    <MessageContent>{content}</MessageContent>
                  )}
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
              onClick={() =>
                groupBots?.length
                  ? regenerate({ metadata: { botId: selectedBotId } })
                  : regenerate()
              }
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
          <PromptInputFooter>
            <PromptInputTools>
              {groupBots && groupBots.length > 1 && (
                <PromptInputSelect
                  onValueChange={(botId) => {
                    if (typeof botId === "string" && botId) {
                      setSelectedBotId(botId)
                    }
                  }}
                  value={selectedBotId}
                >
                  <PromptInputSelectTrigger
                    aria-label={`Choose which bot to talk to${selectedBot ? `, selected ${selectedBot.name}` : ""}`}
                  >
                    {selectedBot ? (
                      <span className="flex min-w-0 items-center gap-2">
                        <ChatAvatar
                          seed={selectedBot.avatar}
                          className="size-5"
                        />
                        <span className="truncate">{selectedBot.name}</span>
                      </span>
                    ) : (
                      <span>Choose a bot</span>
                    )}
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    <SelectGroup>
                      {groupBots.map((bot) => (
                        <PromptInputSelectItem key={bot.id} value={bot.id}>
                          <ChatAvatar seed={bot.avatar} className="size-5" />
                          {bot.name}
                        </PromptInputSelectItem>
                      ))}
                    </SelectGroup>
                  </PromptInputSelectContent>
                </PromptInputSelect>
              )}
            </PromptInputTools>
            <PromptInputSubmit
              disabled={
                (!input.trim() &&
                  status !== "submitted" &&
                  status !== "streaming") ||
                (!!groupBots?.length && !selectedBotId)
              }
              onStop={stop}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </section>
  )
}
