import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import * as schema from './schema';
import { eq, and, count, desc, asc } from 'drizzle-orm';

// 데이터베이스 이름
const DB_NAME = 'everyday_companion.db';

class Database {
  private static instance: Database;
  private db: ReturnType<typeof drizzle> | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * 데이터베이스 초기화
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // SQLite 데이터베이스 열기
      const expoDb = openDatabaseSync(DB_NAME);

      // Drizzle 인스턴스 생성
      this.db = drizzle(expoDb, { schema });

      // 마이그레이션 실행 (테이블 생성)
      await this.runMigrations();

      this.initialized = true;
      console.log('✅ Database initialized with Drizzle ORM');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * 마이그레이션 실행 (개발용 - 수동으로 테이블 생성)
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // 개발 환경에서는 수동으로 테이블 생성
    // 실제 운영에서는 drizzle-kit generate와 migrate 사용

    try {
      // 1. 로컬 저널 테이블 생성
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS local_journals (
          local_id TEXT PRIMARY KEY,
          server_id TEXT UNIQUE,
          user_id TEXT NOT NULL,
          date TEXT NOT NULL,
          mode TEXT NOT NULL,
          emotion_id TEXT,
          shared_groups TEXT,
          sync_status TEXT NOT NULL DEFAULT 'local',
          created_locally_at TEXT NOT NULL,
          last_modified_at TEXT NOT NULL,
          is_shared INTEGER NOT NULL DEFAULT 0,
          conflict_data TEXT
        );
      `);

      // 2. 로컬 저널 엔트리 테이블
      await this.db.run(`
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

      // 3. 업로드 큐 테이블
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS upload_queue (
          id TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          local_journal_id TEXT NOT NULL,
          data TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          retry_after TEXT,
          error_message TEXT,
          FOREIGN KEY (local_journal_id) REFERENCES local_journals (local_id) ON DELETE CASCADE
        );
      `);

      // 4. 사용자 캐시 테이블
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS cached_users (
          id TEXT PRIMARY KEY,
          name TEXT,
          email TEXT NOT NULL,
          profile_img TEXT,
          cached_at TEXT NOT NULL
        );
      `);

      // 5. 그룹 캐시 테이블
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS cached_groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL,
          cached_at TEXT NOT NULL
        );
      `);

      // 인덱스 생성
      await this.db.run(
        'CREATE UNIQUE INDEX IF NOT EXISTS user_date_idx ON local_journals(user_id, date);'
      );
      await this.db.run(
        'CREATE INDEX IF NOT EXISTS sync_status_idx ON local_journals(sync_status);'
      );
      await this.db.run('CREATE INDEX IF NOT EXISTS is_shared_idx ON local_journals(is_shared);');
      await this.db.run(
        'CREATE INDEX IF NOT EXISTS entries_journal_idx ON local_journal_entries(local_journal_id);'
      );
      await this.db.run('CREATE INDEX IF NOT EXISTS queue_retry_idx ON upload_queue(retry_after);');

      console.log('📋 Database tables created successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * 데이터베이스 인스턴스 반환
   */
  getDb(): ReturnType<typeof drizzle> {
    if (!this.db || !this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * 트랜잭션 실행
   */
  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    const db = this.getDb();
    return await db.transaction(callback);
  }

  /**
   * 데이터베이스 통계
   */
  async getStats() {
    const db = this.getDb();

    const [totalJournals, pendingUploads, localOnlyJournals, syncedJournals, conflictJournals] =
      await Promise.all([
        db.select({ count: count() }).from(schema.localJournals),
        db.select({ count: count() }).from(schema.uploadQueue),
        db
          .select({ count: count() })
          .from(schema.localJournals)
          .where(eq(schema.localJournals.syncStatus, 'local')),
        db
          .select({ count: count() })
          .from(schema.localJournals)
          .where(eq(schema.localJournals.syncStatus, 'synced')),
        db
          .select({ count: count() })
          .from(schema.localJournals)
          .where(eq(schema.localJournals.syncStatus, 'conflict')),
      ]);

    return {
      totalJournals: totalJournals[0]?.count || 0,
      pendingUploads: pendingUploads[0]?.count || 0,
      localOnlyJournals: localOnlyJournals[0]?.count || 0,
      syncedJournals: syncedJournals[0]?.count || 0,
      conflictJournals: conflictJournals[0]?.count || 0,
    };
  }

  /**
   * 데이터베이스 리셋 (개발/테스트용)
   */
  async reset(): Promise<void> {
    const db = this.getDb();

    await db.run('DROP TABLE IF EXISTS local_journals;');
    await db.run('DROP TABLE IF EXISTS local_journal_entries;');
    await db.run('DROP TABLE IF EXISTS upload_queue;');
    await db.run('DROP TABLE IF EXISTS cached_users;');
    await db.run('DROP TABLE IF EXISTS cached_groups;');

    await this.runMigrations();
    console.log('🗑️ Database reset completed');
  }
}

// 싱글톤 인스턴스
export const database = Database.getInstance();

// 유틸리티 함수들
export const generateLocalId = (): string => {
  return `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

// Export Drizzle helpers
export { eq, and, or, not, count, desc, asc, like, isNull, isNotNull } from 'drizzle-orm';
