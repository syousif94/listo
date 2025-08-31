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
    name: text('name'),
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

export const userTokens = sqliteTable(
  'user_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .references(() => users.id)
      .notNull(),
    jwt: text('jwt').unique().notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$default(makeNow)
      .notNull(),
  },
  (table) => [
    index('idx_user_tokens_user_id').on(table.userId),
    index('idx_user_tokens_jwt').on(table.jwt),
    index('idx_user_tokens_is_active').on(table.isActive),
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

export const deviceTokens = sqliteTable(
  'device_tokens',
  {
    pushToken: text('push_token').primaryKey(),
    userId: text('user_id')
      .references(() => users.id)
      .notNull(),
    deviceName: text('device_name'),
    platform: text('platform').notNull(), // 'ios' or 'android'
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp' })
      .$default(makeNow)
      .notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .$default(makeNow)
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .$default(makeNow)
      .$onUpdate(makeNow)
      .notNull(),
  },
  (table) => [
    index('idx_device_tokens_user_id').on(table.userId),
    index('idx_device_tokens_is_active').on(table.isActive),
  ]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserToken = typeof userTokens.$inferSelect;
export type NewUserToken = typeof userTokens.$inferInsert;
export type TokenUsage = typeof tokenUsage.$inferSelect;
export type NewTokenUsage = typeof tokenUsage.$inferInsert;
export type DeviceToken = typeof deviceTokens.$inferSelect;
export type NewDeviceToken = typeof deviceTokens.$inferInsert;
