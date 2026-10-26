import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12);

export const bots = pgTable(
  'bots',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text('userId').notNull(),
    name: text('name').notNull(),
    avatar: text('avatar')
      .notNull()
      .$defaultFn(() => nanoid()),
    job: text('job').notNull(),
    instructions: text('instructions'),
    sandboxId: text('sandboxId'),
    createdAt: timestamp('createdAt').defaultNow(),
  },
  (table) => {
    return {
      userIdx: index('user_id_idx').on(table.userId),
    };
  }
);
