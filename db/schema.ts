import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const rooms = sqliteTable('game_rooms', {
 code:text('code').primaryKey(),owner:text('owner').notNull(),state:text('state').notNull(),revision:integer('revision').notNull().default(1),createdAt:integer('created_at').notNull(),expiresAt:integer('expires_at').notNull()
},t=>[index('game_rooms_owner_created').on(t.owner,t.createdAt)]);
