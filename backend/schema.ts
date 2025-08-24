import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

function makeNow() {
  return new Date();
}

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    appleId: text('apple_id').unique().notNull(),
    email: text('email'),
    firstName: text('first_name'),
    lastName: text('last_name'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$default(makeNow)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$default(makeNow)
      .$onUpdate(makeNow)
      .notNull(),
  },
  (table) => [
    index('idx_users_apple_id').on(table.appleId),
    index('idx_users_email').on(table.email),
  ]
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .references(() => users.id)
      .notNull(),
    token: text('token').unique().notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$default(makeNow)
      .notNull(),
  },
  (table) => [
    index('idx_sessions_user_id').on(table.userId),
    index('idx_sessions_token').on(table.token),
    index('idx_sessions_expires_at').on(table.expiresAt),
  ]
);

export const tokenUsage = sqliteTable(
  'token_usage',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id),
    completionTokens: integer('completion_tokens').notNull(),
    promptTokens: integer('prompt_tokens').notNull(),
    totalTokens: integer('total_tokens').notNull(),
    completionTime: integer('completion_time'),
    promptTime: integer('prompt_time'),
    queueTime: integer('queue_time'),
    totalTime: integer('total_time'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$default(makeNow)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$default(makeNow)
      .$onUpdate(makeNow)
      .notNull(),
  },
  (table) => [
    index('idx_token_usage_user_id').on(table.userId),
    index('idx_token_usage_created_at').on(table.createdAt),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type NewTokenUsage = typeof tokenUsage.$inferInsert;
