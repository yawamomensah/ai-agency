import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core"
import { createInsertSchema } from "drizzle-zod"
import { customAlphabet } from "nanoid"

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12)

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
