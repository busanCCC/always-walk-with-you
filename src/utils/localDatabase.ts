import * as SQLite from 'expo-sqlite';
import { Journal, JournalEntry, Emotion } from '@/types/journal';
import { UserGroup } from '@/types/group';

// 로컬 데이터베이스 이름
const DB_NAME = 'everyday_companion.db';

// 로컬 일기 타입 (서버 업로드 상태 포함)
export interface LocalJournal extends Omit<Journal, 'id'> {
  local_id: string; // 로컬 고유 ID
  server_id?: string; // 서버 ID (업로드 후 설정)
  sync_status: 'local' | 'synced' | 'conflict';
  created_locally_at: string;
  last_modified_at: string;
  is_shared: boolean; // 그룹 공유 여부
  conflict_data?: string; // 충돌 시 서버 데이터 JSON
}

// 로컬 일기 엔트리 타입
export interface LocalJournalEntry extends Omit<JournalEntry, 'id' | 'journal_id'> {
  local_id: string;
  local_journal_id: string; // 로컬 일기 ID 참조
  server_id?: string;
  server_journal_id?: string;
}

// 사용자 캐시 타입
export interface CachedUser {
  id: string;
  name: string | null;
  email: string;
  profile_img: string | null;
  cached_at: string;
}

class LocalDatabase {
  private db: SQLite.SQLiteDatabase | null = null;
  private initialized = false;

  /**
   * 데이터베이스 초기화
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.db = await SQLite.openDatabaseAsync(DB_NAME);
      await this.createTables();
      this.initialized = true;
      console.log('✅ Local database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize local database:', error);
      throw error;
    }
  }

  /**
   * 테이블 생성
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // 1. 로컬 일기 테이블
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_journals (
        local_id TEXT PRIMARY KEY,
        server_id TEXT UNIQUE,
        user_id TEXT NOT NULL,
        date TEXT NOT NULL,
        mode TEXT NOT NULL,
        emotion_id TEXT,
        shared_groups TEXT, -- JSON array
        sync_status TEXT NOT NULL DEFAULT 'local',
        created_locally_at TEXT NOT NULL,
        last_modified_at TEXT NOT NULL,
        is_shared BOOLEAN NOT NULL DEFAULT 0,
        conflict_data TEXT, -- JSON for conflict resolution
        
        -- 인덱스를 위한 컬럼들
        UNIQUE(user_id, date) -- 하루 1개 제약
      );
    `);

    // 2. 로컬 일기 엔트리 테이블
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS local_journal_entries (
        local_id TEXT PRIMARY KEY,
        server_id TEXT,
        local_journal_id TEXT NOT NULL,
        server_journal_id TEXT,
        entry_type TEXT NOT NULL,
        text_content TEXT,
        entry_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT,
        updated_at TEXT,
        
        FOREIGN KEY (local_journal_id) REFERENCES local_journals (local_id) ON DELETE CASCADE
      );
    `);

    // 4. 사용자 캐시 테이블
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_users (
        id TEXT PRIMARY KEY,
        name TEXT,
        email TEXT NOT NULL,
        profile_img TEXT,
        cached_at TEXT NOT NULL
      );
    `);

    // 5. 그룹 캐시 테이블
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS cached_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        cached_at TEXT NOT NULL
      );
    `);

    // 인덱스 생성
    await this.db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_journals_user_date ON local_journals(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_journals_sync_status ON local_journals(sync_status);
      CREATE INDEX IF NOT EXISTS idx_journals_shared ON local_journals(is_shared);
      CREATE INDEX IF NOT EXISTS idx_entries_journal ON local_journal_entries(local_journal_id);
    `);

    console.log('📋 Database tables created successfully');
  }

  /**
   * 데이터베이스 인스턴스 반환
   */
  getDb(): SQLite.SQLiteDatabase {
    if (!this.db || !this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * 트랜잭션 실행
   */
  async transaction<T>(callback: (db: SQLite.SQLiteDatabase) => Promise<T>): Promise<T> {
    const db = this.getDb();

    await db.execAsync('BEGIN TRANSACTION;');
    try {
      const result = await callback(db);
      await db.execAsync('COMMIT;');
      return result;
    } catch (error) {
      await db.execAsync('ROLLBACK;');
      throw error;
    }
  }

  /**
   * 데이터베이스 상태 확인
   */
  async getStats(): Promise<{
    totalJournals: number;
    localOnlyJournals: number;
    syncedJournals: number;
    conflictJournals: number;
  }> {
    const db = this.getDb();

    const totalResult = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM local_journals
    `);

    const localOnlyResult = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM local_journals WHERE sync_status = 'local'
    `);

    const syncedResult = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM local_journals WHERE sync_status = 'synced'
    `);

    const conflictResult = await db.getFirstAsync<{ count: number }>(`
      SELECT COUNT(*) as count FROM local_journals WHERE sync_status = 'conflict'
    `);

    return {
      totalJournals: totalResult?.count || 0,
      localOnlyJournals: localOnlyResult?.count || 0,
      syncedJournals: syncedResult?.count || 0,
      conflictJournals: conflictResult?.count || 0,
    };
  }

  /**
   * 데이터베이스 초기화 (개발/테스트용)
   */
  async reset(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      DROP TABLE IF EXISTS local_journals;
      DROP TABLE IF EXISTS local_journal_entries;
      DROP TABLE IF EXISTS cached_users;
      DROP TABLE IF EXISTS cached_groups;
    `);

    await this.createTables();
    console.log('🗑️ Database reset completed');
  }

  /**
   * 데이터베이스 연결 종료
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.initialized = false;
      console.log('📴 Database connection closed');
    }
  }
}

// 싱글톤 인스턴스
export const localDb = new LocalDatabase();

// 유틸리티 함수들
export const generateLocalId = (): string => {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

export const isLocalOnly = (journal: LocalJournal): boolean => {
  return journal.sync_status === 'local';
};

export const isSynced = (journal: LocalJournal): boolean => {
  return journal.sync_status === 'synced';
};

export const hasConflict = (journal: LocalJournal): boolean => {
  return journal.sync_status === 'conflict';
};
