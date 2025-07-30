import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// 로컬 저널 테이블
export const localJournals = sqliteTable(
  'local_journals',
  {
    localId: text('local_id').primaryKey(),
    serverId: text('server_id').unique(),
    userId: text('user_id').notNull(),
    date: text('date').notNull(),
    mode: text('mode', { enum: ['free_writing', 'prompt_based', 'handwriting_upload'] }).notNull(),
    emotionId: text('emotion_id'),
    sharedGroups: text('shared_groups'), // JSON array
    syncStatus: text('sync_status', { enum: ['local', 'pending', 'synced', 'conflict'] })
      .notNull()
      .default('local'),
    createdLocallyAt: text('created_locally_at').notNull(),
    lastModifiedAt: text('last_modified_at').notNull(),
    isShared: integer('is_shared', { mode: 'boolean' }).notNull().default(false),
    conflictData: text('conflict_data'), // JSON for conflict resolution
  },
  (table) => {
    return {
      userDateIdx: uniqueIndex('user_date_idx').on(table.userId, table.date), // 하루 1개 제약
      syncStatusIdx: index('sync_status_idx').on(table.syncStatus),
      isSharedIdx: index('is_shared_idx').on(table.isShared),
    };
  }
);

// 로컬 저널 엔트리 테이블
export const localJournalEntries = sqliteTable(
  'local_journal_entries',
  {
    localId: text('local_id').primaryKey(),
    serverId: text('server_id'),
    localJournalId: text('local_journal_id')
      .notNull()
      .references(() => localJournals.localId, { onDelete: 'cascade' }),
    serverJournalId: text('server_journal_id'),
    entryType: text('entry_type', { enum: ['general', 'answer'] }).notNull(),
    textContent: text('text_content'),
    entryOrder: integer('entry_order').notNull().default(0),
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
  },
  (table) => {
    return {
      journalIdx: index('entries_journal_idx').on(table.localJournalId),
    };
  }
);

// 업로드 큐 테이블
export const uploadQueue = sqliteTable(
  'upload_queue',
  {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['create_journal', 'update_journal', 'delete_journal'] }).notNull(),
    localJournalId: text('local_journal_id')
      .notNull()
      .references(() => localJournals.localId, { onDelete: 'cascade' }),
    data: text('data').notNull(), // JSON data
    attempts: integer('attempts').notNull().default(0),
    createdAt: text('created_at').notNull(),
    retryAfter: text('retry_after'),
    errorMessage: text('error_message'),
  },
  (table) => {
    return {
      retryIdx: index('queue_retry_idx').on(table.retryAfter),
    };
  }
);

// 사용자 캐시 테이블
export const cachedUsers = sqliteTable('cached_users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull(),
  profileImg: text('profile_img'),
  cachedAt: text('cached_at').notNull(),
});

// 그룹 캐시 테이블
export const cachedGroups = sqliteTable('cached_groups', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  cachedAt: text('cached_at').notNull(),
});

// Relations 정의 (조인을 위한)
export const localJournalsRelations = relations(localJournals, ({ many }) => ({
  entries: many(localJournalEntries),
  uploadQueue: many(uploadQueue),
}));

export const localJournalEntriesRelations = relations(localJournalEntries, ({ one }) => ({
  journal: one(localJournals, {
    fields: [localJournalEntries.localJournalId],
    references: [localJournals.localId],
  }),
}));

export const uploadQueueRelations = relations(uploadQueue, ({ one }) => ({
  journal: one(localJournals, {
    fields: [uploadQueue.localJournalId],
    references: [localJournals.localId],
  }),
}));

// 타입 정의 (자동 추론)
export type LocalJournal = typeof localJournals.$inferSelect;
export type LocalJournalInsert = typeof localJournals.$inferInsert;
export type LocalJournalEntry = typeof localJournalEntries.$inferSelect;
export type LocalJournalEntryInsert = typeof localJournalEntries.$inferInsert;
export type UploadQueueItem = typeof uploadQueue.$inferSelect;
export type UploadQueueInsert = typeof uploadQueue.$inferInsert;
export type CachedUser = typeof cachedUsers.$inferSelect;
export type CachedGroup = typeof cachedGroups.$inferSelect;
