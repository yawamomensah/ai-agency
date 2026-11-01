import { auth } from "@clerk/nextjs/server"
import { formatDistanceToNowStrict } from "date-fns"
import { and, asc, desc, eq } from "drizzle-orm"

import { bots, chatMembers, chats } from "@/db/schema"
import { getDb } from "@/lib/db"

export async function getUserChats() {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  const db = getDb()
  const [fallbackBots, chatRows] = await Promise.all([
    db
      .select({
        name: bots.name,
        avatar: bots.avatar,
      })
      .from(bots)
      .where(eq(bots.userId, userId))
      .orderBy(asc(bots.createdAt), asc(bots.id))
      .limit(1),
    db
      .select({
        id: chats.id,
        name: chats.name,
        kind: chats.kind,
        lastMessagePreview: chats.lastMessagePreview,
        lastMessageAt: chats.lastMessageAt,
        botName: bots.name,
        botAvatar: bots.avatar,
      })
      .from(chats)
      .leftJoin(chatMembers, eq(chatMembers.chatId, chats.id))
      .leftJoin(
        bots,
        and(eq(bots.id, chatMembers.botId), eq(bots.userId, userId))
      )
      .where(eq(chats.userId, userId))
      .orderBy(desc(chats.lastMessageAt), asc(chatMembers.joinedAt)),
  ])
  const fallbackBot = fallbackBots[0]
  const groupedChats = new Map<
    string,
    { row: (typeof chatRows)[number]; avatarSeeds: string[] }
  >()

  for (const row of chatRows) {
    const existing = groupedChats.get(row.id)

    if (existing) {
      if (row.botAvatar) {
        existing.avatarSeeds.push(row.botAvatar)
      }
      continue
    }

    groupedChats.set(row.id, {
      row,
      avatarSeeds: row.botAvatar ? [row.botAvatar] : [],
    })
  }

  return Array.from(groupedChats.values(), ({ row, avatarSeeds }) => ({
    id: row.id,
    title: row.name ?? row.botName ?? fallbackBot?.name ?? "New chat",
    kind: row.kind,
    avatarSeeds:
      avatarSeeds.length > 0 ? avatarSeeds : [fallbackBot?.avatar ?? row.id],
    preview: row.lastMessagePreview || "Start a conversation",
    lastMessageAt: row.lastMessageAt.toISOString(),
    timeLabel: formatDistanceToNowStrict(row.lastMessageAt),
  }))
}

export async function getUserBots() {
  const { userId } = await auth()

  if (!userId) {
    return []
  }

  return getDb()
    .select({
      id: bots.id,
      name: bots.name,
      avatar: bots.avatar,
      job: bots.job,
    })
    .from(bots)
    .where(eq(bots.userId, userId))
    .orderBy(asc(bots.createdAt), asc(bots.id))
}
