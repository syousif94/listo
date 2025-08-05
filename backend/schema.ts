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
    userId: text('user_id').references(() => users.id).notNull(),
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
