import {
  localDb,
  LocalJournal,
  LocalJournalEntry,
  generateLocalId,
  getCurrentTimestamp,
  isLocalOnly,
  isSyncPending,
} from '@/utils/localDatabase';
import { Journal, JournalEntry } from '@/types/journal';

// 저널 생성 데이터 타입
export interface CreateLocalJournalData {
  user_id: string;
  date: string;
  mode: 'free_writing' | 'prompt_based' | 'handwriting_upload';
  emotion_id: string;
  content?: string;
  answers?: Array<{ answer: string; order: number }>;
  shared_groups?: string[];
}

// 저널 업데이트 데이터 타입
export interface UpdateLocalJournalData {
  mode?: 'free_writing' | 'prompt_based' | 'handwriting_upload';
  emotion_id?: string;
  content?: string;
  answers?: Array<{ answer: string; order: number }>;
  shared_groups?: string[];
}

class LocalJournalApi {
  /**
   * 특정 날짜에 저널이 존재하는지 확인
   */
  async checkJournalExistsForDate(userId: string, date: string): Promise<boolean> {
    const db = localDb.getDb();

    const result = await db.getFirstAsync<{ count: number }>(
      `
      SELECT COUNT(*) as count 
      FROM local_journals 
      WHERE user_id = ? AND date = ?
    `,
      [userId, date]
    );

    return (result?.count || 0) > 0;
  }

  /**
   * 로컬 저널 생성
   */
  async createJournal(data: CreateLocalJournalData): Promise<LocalJournal> {
    const db = localDb.getDb();

    // 하루 1개 제약 확인
    const exists = await this.checkJournalExistsForDate(data.user_id, data.date);
    if (exists) {
      throw new Error('해당 날짜에 이미 일기가 존재합니다.');
    }

    const now = getCurrentTimestamp();
    const localId = generateLocalId();
    const isShared = data.shared_groups && data.shared_groups.length > 0;

    return await localDb.transaction(async (db) => {
      // 1. 저널 생성
      await db.runAsync(
        `
        INSERT INTO local_journals (
          local_id, user_id, date, mode, emotion_id, shared_groups,
          sync_status, created_locally_at, last_modified_at, is_shared
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          localId,
          data.user_id,
          data.date,
          data.mode,
          data.emotion_id,
          JSON.stringify(data.shared_groups || []),
          isShared ? 'pending' : 'local', // 공유 시 업로드 대기
          now,
          now,
          isShared ? 1 : 0,
        ]
      );

      // 2. 저널 엔트리 생성
      if (data.mode === 'free_writing' && data.content) {
        await this.createJournalEntry(localId, {
          entry_type: 'general',
          text_content: data.content,
          entry_order: 1,
        });
      } else if (data.mode === 'prompt_based' && data.answers) {
        for (const answer of data.answers) {
          await this.createJournalEntry(localId, {
            entry_type: 'answer',
            text_content: answer.answer,
            entry_order: answer.order,
          });
        }
      }

      // 3. 생성된 저널 반환
      return await this.getJournalById(localId);
    });
  }

  /**
   * 저널 엔트리 생성 (내부 함수)
   */
  private async createJournalEntry(
    localJournalId: string,
    data: {
      entry_type: 'general' | 'answer';
      text_content: string;
      entry_order: number;
    }
  ): Promise<void> {
    const db = localDb.getDb();
    const entryId = generateLocalId();
    const now = getCurrentTimestamp();

    await db.runAsync(
      `
      INSERT INTO local_journal_entries (
        local_id, local_journal_id, entry_type, text_content, 
        entry_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      [entryId, localJournalId, data.entry_type, data.text_content, data.entry_order, now, now]
    );
  }

  /**
   * 저널 ID로 조회
   */
  async getJournalById(localId: string): Promise<LocalJournal> {
    const db = localDb.getDb();

    const journal = await db.getFirstAsync<any>(
      `
      SELECT * FROM local_journals WHERE local_id = ?
    `,
      [localId]
    );

    if (!journal) {
      throw new Error(`저널을 찾을 수 없습니다: ${localId}`);
    }

    // 저널 엔트리 조회
    const entries = await db.getAllAsync<any>(
      `
      SELECT * FROM local_journal_entries 
      WHERE local_journal_id = ? 
      ORDER BY entry_order ASC
    `,
      [localId]
    );

    return this.mapToLocalJournal(journal, entries);
  }

  /**
   * 특정 날짜의 저널 조회
   */
  async getJournalByDate(userId: string, date: string): Promise<LocalJournal | null> {
    const db = localDb.getDb();

    const journal = await db.getFirstAsync<any>(
      `
      SELECT * FROM local_journals 
      WHERE user_id = ? AND date = ?
    `,
      [userId, date]
    );

    if (!journal) return null;

    const entries = await db.getAllAsync<any>(
      `
      SELECT * FROM local_journal_entries 
      WHERE local_journal_id = ? 
      ORDER BY entry_order ASC
    `,
      [journal.local_id]
    );

    return this.mapToLocalJournal(journal, entries);
  }

  /**
   * 날짜 범위로 저널 조회
   */
  async getJournalsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<LocalJournal[]> {
    const db = localDb.getDb();

    const journals = await db.getAllAsync<any>(
      `
      SELECT * FROM local_journals 
      WHERE user_id = ? AND date >= ? AND date <= ?
      ORDER BY date DESC
    `,
      [userId, startDate, endDate]
    );

    const result: LocalJournal[] = [];

    for (const journal of journals) {
      const entries = await db.getAllAsync<any>(
        `
        SELECT * FROM local_journal_entries 
        WHERE local_journal_id = ? 
        ORDER BY entry_order ASC
      `,
        [journal.local_id]
      );

      result.push(this.mapToLocalJournal(journal, entries));
    }

    return result;
  }

  /**
   * 저널 업데이트
   */
  async updateJournal(localId: string, data: UpdateLocalJournalData): Promise<LocalJournal> {
    const db = localDb.getDb();
    const now = getCurrentTimestamp();

    return await localDb.transaction(async (db) => {
      // 1. 기존 저널 조회
      const existing = await this.getJournalById(localId);

      const isShared = data.shared_groups && data.shared_groups.length > 0;
      const newSyncStatus = isShared
        ? 'pending'
        : existing.sync_status === 'synced'
          ? 'pending'
          : existing.sync_status;

      // 2. 저널 기본 정보 업데이트
      await db.runAsync(
        `
        UPDATE local_journals SET
          mode = COALESCE(?, mode),
          emotion_id = COALESCE(?, emotion_id),
          shared_groups = COALESCE(?, shared_groups),
          sync_status = ?,
          last_modified_at = ?,
          is_shared = ?
        WHERE local_id = ?
      `,
        [
          data.mode || null,
          data.emotion_id || null,
          data.shared_groups ? JSON.stringify(data.shared_groups) : null,
          newSyncStatus,
          now,
          isShared ? 1 : 0,
          localId,
        ]
      );

      // 3. 저널 엔트리 업데이트 (기존 삭제 후 재생성)
      if (data.content !== undefined || data.answers !== undefined) {
        // 기존 엔트리 삭제
        await db.runAsync(
          `
          DELETE FROM local_journal_entries WHERE local_journal_id = ?
        `,
          [localId]
        );

        // 새 엔트리 생성
        const mode = data.mode || existing.mode;
        if (mode === 'free_writing' && data.content) {
          await this.createJournalEntry(localId, {
            entry_type: 'general',
            text_content: data.content,
            entry_order: 1,
          });
        } else if (mode === 'prompt_based' && data.answers) {
          for (const answer of data.answers) {
            await this.createJournalEntry(localId, {
              entry_type: 'answer',
              text_content: answer.answer,
              entry_order: answer.order,
            });
          }
        }
      }

      // 4. 업데이트된 저널 반환
      return await this.getJournalById(localId);
    });
  }

  /**
   * 저널 삭제
   */
  async deleteJournal(localId: string): Promise<void> {
    const db = localDb.getDb();

    await localDb.transaction(async (db) => {
      // 저널 엔트리 삭제 (CASCADE로 자동 삭제되지만 명시적으로)
      await db.runAsync(
        `
        DELETE FROM local_journal_entries WHERE local_journal_id = ?
      `,
        [localId]
      );

      // 저널 삭제
      await db.runAsync(
        `
        DELETE FROM local_journals WHERE local_id = ?
      `,
        [localId]
      );
    });
  }

  /**
   * 업로드 대기 중인 저널들 조회
   */
  async getPendingJournals(): Promise<LocalJournal[]> {
    const db = localDb.getDb();

    const journals = await db.getAllAsync<any>(`
      SELECT * FROM local_journals 
      WHERE sync_status = 'pending'
      ORDER BY created_locally_at ASC
    `);

    const result: LocalJournal[] = [];

    for (const journal of journals) {
      const entries = await db.getAllAsync<any>(
        `
        SELECT * FROM local_journal_entries 
        WHERE local_journal_id = ? 
        ORDER BY entry_order ASC
      `,
        [journal.local_id]
      );

      result.push(this.mapToLocalJournal(journal, entries));
    }

    return result;
  }

  /**
   * 동기화 상태 업데이트
   */
  async updateSyncStatus(
    localId: string,
    status: 'local' | 'pending' | 'synced' | 'conflict',
    serverId?: string,
    conflictData?: any
  ): Promise<void> {
    const db = localDb.getDb();
    const now = getCurrentTimestamp();

    await db.runAsync(
      `
      UPDATE local_journals SET
        sync_status = ?,
        server_id = COALESCE(?, server_id),
        conflict_data = ?,
        last_modified_at = ?
      WHERE local_id = ?
    `,
      [status, serverId || null, conflictData ? JSON.stringify(conflictData) : null, now, localId]
    );
  }

  /**
   * DB 로우를 LocalJournal 객체로 매핑
   */
  private mapToLocalJournal(journalRow: any, entryRows: any[]): LocalJournal {
    const entries: LocalJournalEntry[] = entryRows.map((row) => ({
      local_id: row.local_id,
      local_journal_id: row.local_journal_id,
      server_id: row.server_id,
      server_journal_id: row.server_journal_id,
      entry_type: row.entry_type,
      text_content: row.text_content,
      entry_order: row.entry_order,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return {
      local_id: journalRow.local_id,
      server_id: journalRow.server_id,
      user_id: journalRow.user_id,
      date: journalRow.date,
      mode: journalRow.mode,
      emotion_id: journalRow.emotion_id,
      shared_groups: journalRow.shared_groups ? JSON.parse(journalRow.shared_groups) : [],
      sync_status: journalRow.sync_status,
      created_locally_at: journalRow.created_locally_at,
      last_modified_at: journalRow.last_modified_at,
      is_shared: Boolean(journalRow.is_shared),
      conflict_data: journalRow.conflict_data,
      created_at: journalRow.created_locally_at,
      updated_at: journalRow.last_modified_at,
      emotion: null, // 별도 조회 필요
      journal_entries: entries as any, // 타입 호환성을 위한 임시 캐스팅
      user: null, // 별도 조회 필요
    };
  }

  /**
   * LocalJournal을 Journal 형태로 변환 (기존 API 호환성)
   */
  convertToJournal(localJournal: LocalJournal): Journal {
    return {
      id: localJournal.server_id || localJournal.local_id,
      user_id: localJournal.user_id,
      date: localJournal.date,
      mode: localJournal.mode,
      emotion_id: localJournal.emotion_id,
      shared_groups: localJournal.shared_groups,
      created_at: localJournal.created_at,
      updated_at: localJournal.updated_at,
      emotion: localJournal.emotion,
      journal_entries:
        localJournal.journal_entries?.map((entry: any) => ({
          id: entry.server_id || entry.local_id || entry.id,
          journal_id: entry.server_journal_id || entry.local_journal_id || entry.journal_id,
          entry_type: entry.entry_type,
          text_content: entry.text_content,
          entry_order: entry.entry_order,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
        })) || [],
      user: localJournal.user,
    };
  }
}

// 싱글톤 인스턴스
export const localJournalApi = new LocalJournalApi();
