import { database, generateLocalId, getCurrentTimestamp, eq, and, desc, asc } from '@/db/database';
import { sql, gte, lte } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type {
  LocalJournal,
  LocalJournalInsert,
  LocalJournalEntry,
  LocalJournalEntryInsert,
} from '@/db/schema';
import { Journal } from '@/types/journal';

// 일기 생성 데이터 타입
export interface CreateLocalJournalData {
  user_id: string;
  date: string;
  mode: 'free_writing' | 'prompt_based' | 'handwriting_upload';
  emotion_id: string;
  content?: string;
  answers?: Array<{ answer: string; order: number }>;
  shared_groups?: string[];
}

// 일기 업데이트 데이터 타입
export interface UpdateLocalJournalData {
  mode?: 'free_writing' | 'prompt_based' | 'handwriting_upload';
  emotion_id?: string;
  content?: string;
  answers?: Array<{ answer: string; order: number }>;
  shared_groups?: string[];
}

class LocalJournalApiDrizzle {
  /**
   * 특정 날짜에 일기이 존재하는지 확인
   */
  async checkJournalExistsForDate(userId: string, date: string): Promise<boolean> {
    const db = database.getDb();

    const result = await db
      .select()
      .from(schema.localJournals)
      .where(and(eq(schema.localJournals.userId, userId), eq(schema.localJournals.date, date)))
      .limit(1);

    return result.length > 0;
  }

  /**
   * 로컬 일기 생성 🚀 (SQL 없이!)
   */
  async createJournal(
    data: CreateLocalJournalData
  ): Promise<LocalJournal & { entries: LocalJournalEntry[] }> {
    // 하루 1개 제약 확인
    const exists = await this.checkJournalExistsForDate(data.user_id, data.date);
    if (exists) {
      throw new Error('해당 날짜에 이미 일기가 존재합니다.');
    }

    const now = getCurrentTimestamp();
    const localId = generateLocalId();
    const isShared = data.shared_groups && data.shared_groups.length > 0;

    return await database.transaction(async (tx) => {
      // 1. 일기 생성 ✨
      const journalData: LocalJournalInsert = {
        localId,
        userId: data.user_id,
        date: data.date,
        mode: data.mode,
        emotionId: data.emotion_id,
        sharedGroups: JSON.stringify(data.shared_groups || []),
        syncStatus: isShared ? 'synced' : 'local',
        createdLocallyAt: now,
        lastModifiedAt: now,
        isShared: isShared,
      };

      await tx.insert(schema.localJournals).values(journalData);

      // 2. 일기 엔트리 생성 ✨
      const entries: LocalJournalEntry[] = [];

      if (data.mode === 'free_writing' && data.content) {
        const entryData: LocalJournalEntryInsert = {
          localId: generateLocalId(),
          localJournalId: localId,
          entryType: 'general',
          textContent: data.content,
          entryOrder: 1,
          createdAt: now,
          updatedAt: now,
        };

        await tx.insert(schema.localJournalEntries).values(entryData);
        entries.push(entryData as LocalJournalEntry);
      } else if (data.mode === 'prompt_based' && data.answers) {
        const entryDataList: LocalJournalEntryInsert[] = data.answers.map((answer) => ({
          localId: generateLocalId(),
          localJournalId: localId,
          entryType: 'answer' as const,
          textContent: answer.answer,
          entryOrder: answer.order,
          createdAt: now,
          updatedAt: now,
        }));

        await tx.insert(schema.localJournalEntries).values(entryDataList);
        entries.push(...(entryDataList as LocalJournalEntry[]));
      }

      // 3. 생성된 일기 반환
      const journal = await tx
        .select()
        .from(schema.localJournals)
        .where(eq(schema.localJournals.localId, localId))
        .limit(1);

      return {
        ...journal[0],
        entries,
      };
    });
  }

  /**
   * 일기 ID로 조회 🔍
   */
  async getJournalById(localId: string): Promise<LocalJournal & { entries: LocalJournalEntry[] }> {
    const db = database.getDb();

    // 일기과 엔트리 함께 조회 (JOIN 사용)
    const result = await db
      .select()
      .from(schema.localJournals)
      .leftJoin(
        schema.localJournalEntries,
        eq(schema.localJournals.localId, schema.localJournalEntries.localJournalId)
      )
      .where(eq(schema.localJournals.localId, localId));

    if (result.length === 0) {
      throw new Error(`일기를 찾을 수 없습니다: ${localId}`);
    }

    const journal = result[0].local_journals;
    const entries = result
      .map((row) => row.local_journal_entries)
      .filter((entry) => entry !== null)
      .sort((a, b) => (a?.entryOrder || 0) - (b?.entryOrder || 0));

    return {
      ...journal,
      entries: entries as LocalJournalEntry[],
    };
  }

  /**
   * 특정 날짜의 일기 조회 📅
   */
  async getJournalByDate(
    userId: string,
    date: string
  ): Promise<(LocalJournal & { entries: LocalJournalEntry[] }) | null> {
    const db = database.getDb();

    const result = await db
      .select()
      .from(schema.localJournals)
      .leftJoin(
        schema.localJournalEntries,
        eq(schema.localJournals.localId, schema.localJournalEntries.localJournalId)
      )
      .where(and(eq(schema.localJournals.userId, userId), eq(schema.localJournals.date, date)));

    if (result.length === 0) return null;

    const journal = result[0].local_journals;
    const entries = result
      .map((row) => row.local_journal_entries)
      .filter((entry) => entry !== null)
      .sort((a, b) => (a?.entryOrder || 0) - (b?.entryOrder || 0));

    return {
      ...journal,
      entries: entries as LocalJournalEntry[],
    };
  }

  /**
   * 날짜 범위로 일기 조회 📊
   */
  async getJournalsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<LocalJournal[]> {
    const db = database.getDb();

    const journals = await db
      .select()
      .from(schema.localJournals)
      .where(
        and(
          eq(schema.localJournals.userId, userId),
          // Drizzle에서는 gte, lte 함수를 직접 제공하지 않으므로 SQL 함수 사용
          // @ts-ignore
          sql`${schema.localJournals.date} >= ${startDate}`,
          // @ts-ignore
          sql`${schema.localJournals.date} <= ${endDate}`
        )
      )
      .orderBy(desc(schema.localJournals.date));

    return journals;
  }

  /**
   * 날짜 범위로 일기 조회 (완전한 정보 포함) 📊🔗
   */
  async getJournalsWithDetailsByDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<(LocalJournal & { entries: LocalJournalEntry[] })[]> {
    const db = database.getDb();

    const journals = await db
      .select()
      .from(schema.localJournals)
      .where(
        and(
          eq(schema.localJournals.userId, userId),
          // @ts-ignore
          sql`${schema.localJournals.date} >= ${startDate}`,
          // @ts-ignore
          sql`${schema.localJournals.date} <= ${endDate}`
        )
      )
      .orderBy(desc(schema.localJournals.date));

    // 각 일기에 대해 엔트리들을 조회하고 추가
    const journalsWithDetails = await Promise.all(
      journals.map(async (journal) => {
        const entries = await db
          .select()
          .from(schema.localJournalEntries)
          .where(eq(schema.localJournalEntries.localJournalId, journal.localId))
          .orderBy(asc(schema.localJournalEntries.entryOrder));

        return {
          ...journal,
          entries: entries as LocalJournalEntry[],
        };
      })
    );

    return journalsWithDetails;
  }

  /**
   * 일기 업데이트 ✏️
   */
  async updateJournal(
    localId: string,
    data: UpdateLocalJournalData
  ): Promise<LocalJournal & { entries: LocalJournalEntry[] }> {
    const now = getCurrentTimestamp();

    return await database.transaction(async (tx) => {
      // 1. 기존 일기 조회
      const existing = await this.getJournalById(localId);

      const isShared = data.shared_groups && data.shared_groups.length > 0;
      const newSyncStatus = isShared ? 'synced' : 'local';

      // 2. 일기 기본 정보 업데이트 ✨
      await tx
        .update(schema.localJournals)
        .set({
          mode: data.mode || undefined,
          emotionId: data.emotion_id || undefined,
          sharedGroups: data.shared_groups ? JSON.stringify(data.shared_groups) : undefined,
          syncStatus: newSyncStatus,
          lastModifiedAt: now,
          isShared: isShared,
        })
        .where(eq(schema.localJournals.localId, localId));

      // 3. 일기 엔트리 업데이트 (기존 삭제 후 재생성)
      if (data.content !== undefined || data.answers !== undefined) {
        // 기존 엔트리 삭제
        await tx
          .delete(schema.localJournalEntries)
          .where(eq(schema.localJournalEntries.localJournalId, localId));

        // 새 엔트리 생성
        const mode = data.mode || existing.mode;
        if (mode === 'free_writing' && data.content) {
          await tx.insert(schema.localJournalEntries).values({
            localId: generateLocalId(),
            localJournalId: localId,
            entryType: 'general',
            textContent: data.content,
            entryOrder: 1,
            createdAt: now,
            updatedAt: now,
          });
        } else if (mode === 'prompt_based' && data.answers) {
          const entryDataList = data.answers.map((answer) => ({
            localId: generateLocalId(),
            localJournalId: localId,
            entryType: 'answer' as const,
            textContent: answer.answer,
            entryOrder: answer.order,
            createdAt: now,
            updatedAt: now,
          }));

          await tx.insert(schema.localJournalEntries).values(entryDataList);
        }
      }

      // 4. 업데이트된 일기 반환
      return await this.getJournalById(localId);
    });
  }

  /**
   * 일기 삭제 🗑️
   */
  async deleteJournal(localId: string): Promise<void> {
    const db = database.getDb();

    await database.transaction(async (tx) => {
      // 일기 엔트리 삭제 (CASCADE로 자동 삭제되지만 명시적으로)
      await tx
        .delete(schema.localJournalEntries)
        .where(eq(schema.localJournalEntries.localJournalId, localId));

      // 일기 삭제
      await tx.delete(schema.localJournals).where(eq(schema.localJournals.localId, localId));
    });
  }

  /**
   * 동기화 상태 업데이트 🔄
   */
  async updateSyncStatus(
    localId: string,
    status: 'local' | 'synced' | 'conflict',
    serverId?: string,
    conflictData?: any
  ): Promise<void> {
    const db = database.getDb();
    const now = getCurrentTimestamp();

    await db
      .update(schema.localJournals)
      .set({
        syncStatus: status,
        serverId: serverId || undefined,
        conflictData: conflictData ? JSON.stringify(conflictData) : undefined,
        lastModifiedAt: now,
      })
      .where(eq(schema.localJournals.localId, localId));
  }

  /**
   * LocalJournal을 Journal 형태로 변환 (기존 API 호환성) 🔄
   */
  convertToJournal(localJournal: LocalJournal & { entries?: LocalJournalEntry[] }): Journal {
    return {
      id: localJournal.localId, // 항상 로컬 ID 사용
      user_id: localJournal.userId,
      date: localJournal.date,
      mode: localJournal.mode,
      emotion_id: localJournal.emotionId,
      shared_groups: localJournal.sharedGroups ? JSON.parse(localJournal.sharedGroups) : [],
      created_at: localJournal.createdLocallyAt,
      updated_at: localJournal.lastModifiedAt,
      emotion: null, // 별도 조회 필요
      journal_entries:
        localJournal.entries?.map((entry) => ({
          id: entry.localId, // 항상 로컬 ID 사용
          journal_id: entry.localJournalId, // 항상 로컬 ID 사용
          entry_type: entry.entryType,
          text_content: entry.textContent,
          entry_order: entry.entryOrder,
          created_at: entry.createdAt || undefined,
          updated_at: entry.updatedAt || undefined,
        })) || [],
      user: null, // 별도 조회 필요
    };
  }
}

// 싱글톤 인스턴스
export const localJournalApi = new LocalJournalApiDrizzle();

// 🎉 이제 SQL 쿼리 없이 깔끔한 ORM 방식!
// 예시:
// const journal = await localJournalApi.createJournal({...data});
// const journals = await localJournalApi.getJournalsByDateRange(userId, start, end);
