import { relations } from "drizzle-orm"
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { customAlphabet } from "nanoid"

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12)

export const chatKindEnum = pgEnum("chat_kind", ["direct", "group"])

export const bots = pgTable(
  "bots",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("userId").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar")
      .notNull()
      .$defaultFn(() => nanoid()),
    job: text("job").notNull(),
    instructions: text("instructions"),
    sandboxId: text("sandboxId"),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => {
    return {
      userIdx: index("user_id_idx").on(table.userId),
    }
  }
)

export const chats = pgTable(
  "chats",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text("userId").notNull(),
    kind: chatKindEnum("kind").notNull().default("direct"),
    name: text("name"),
    lastMessagePreview: text("lastMessagePreview"),
    lastMessageAt: timestamp("lastMessageAt").notNull().defaultNow(),
    createdAt: timestamp("createdAt").defaultNow(),
  },
  (table) => ({
    userIdx: index("chats_user_id_idx").on(table.userId),
  })
)

export const chatMembers = pgTable(
  "chatMembers",
  {
    chatId: text("chatId")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    botId: text("botId")
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joinedAt").defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.botId] }),
    botIdx: index("chat_members_bot_id_idx").on(table.botId),
  })
)

export const botsRelations = relations(bots, ({ many }) => ({
  memberships: many(chatMembers),
}))

export const chatsRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
}))

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMembers.chatId],
    references: [chats.id],
  }),
  bot: one(bots, {
    fields: [chatMembers.botId],
    references: [bots.id],
  }),
}))

export const insertBotSchema = createInsertSchema(bots, {
  name: (schema) => schema.trim().min(1, "Name is required").max(80),
  job: (schema) => schema.trim().min(1, "Role is required").max(120),
  avatar: (schema) => schema.trim().min(1).max(128),
  instructions: (schema) => schema.trim().max(2000),
})

export const createBotSchema = insertBotSchema.omit({
  id: true,
  userId: true,
  sandboxId: true,
  createdAt: true,
})
