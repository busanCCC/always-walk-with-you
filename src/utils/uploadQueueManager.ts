import {
  database,
  generateLocalId,
  getCurrentTimestamp,
  eq,
  and,
  desc,
  asc,
  count,
  isNotNull,
} from '@/db/database';
import * as schema from '@/db/schema';
import type { UploadQueueItem, UploadQueueInsert, LocalJournal } from '@/db/schema';
import { networkManager } from '@/utils/networkManager';
import {
  createJournal as serverCreateJournal,
  updateJournal as serverUpdateJournal,
} from '@/apis/journalApi';
import { localJournalApi } from '@/apis/localJournalApiDrizzle';
import { supabase } from '@/utils/supabaseClient';
import Toast from 'react-native-toast-message';

// 큐 통계 인터페이스
export interface QueueStats {
  total: number; // 전체 큐 아이템 수
  pending: number; // 처리 대기 중인 수
  failed: number; // 실패한 수
  processing: number; // 처리 중인 수
  completed: number; // 완료된 수
  lastProcessedAt?: string; // 마지막 처리 시간
}

// 저널 데이터가 포함된 큐 아이템
export interface QueueItemWithJournal extends UploadQueueItem {
  journal?: LocalJournal;
  retryIn?: number; // 다음 재시도까지 남은 시간(초)
}

class UploadQueueManager {
  private static instance: UploadQueueManager;
  private isProcessing = false;
  // 주기적 처리는 제거 - 네트워크 상태 변화에만 반응

  private constructor() {}

  static getInstance(): UploadQueueManager {
    if (!UploadQueueManager.instance) {
      UploadQueueManager.instance = new UploadQueueManager();
    }
    return UploadQueueManager.instance;
  }

  /**
   * 업로드 큐에 작업 추가 📤
   */
  async addToQueue(
    type: 'create_journal' | 'update_journal' | 'delete_journal',
    localJournalId: string,
    data: any
  ): Promise<void> {
    const db = database.getDb();
    const now = getCurrentTimestamp();

    const queueItem: UploadQueueInsert = {
      id: generateLocalId(),
      type,
      localJournalId,
      data: JSON.stringify(data),
      attempts: 0,
      createdAt: now,
    };

    await db.insert(schema.uploadQueue).values(queueItem);
    console.log(`📤 큐에 작업 추가됨: ${type} (저널 ID: ${localJournalId})`);

    // 온라인 상태면 즉시 처리 시도
    if (networkManager.isOnline()) {
      this.processQueue();
    } else {
      Toast.show({
        type: 'info',
        text1: '오프라인 상태',
        text2: '온라인 상태일 때 자동으로 업로드됩니다',
        visibilityTime: 3000,
      });
    }
  }

  /**
   * 업로드 큐 처리 실행 🔄
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !networkManager.isOnline()) {
      return;
    }

    // 데이터베이스 초기화 상태 확인
    try {
      database.getDb();
    } catch (error) {
      console.log('⏳ 데이터베이스 초기화 대기 중 - 큐 처리 건너뜀');
      return;
    }

    this.isProcessing = true;
    console.log('🔄 업로드 큐 처리 중...');

    try {
      const db = database.getDb();

      // 처리 가능한 큐 아이템들 조회 (재시도 시간이 지난 것들)
      const now = new Date().toISOString();
      const queueItems = await db
        .select()
        .from(schema.uploadQueue)
        .orderBy(asc(schema.uploadQueue.createdAt))
        .limit(50); // 모든 아이템을 가져온 후 JavaScript에서 필터링

      // retryAfter 필터링 (JavaScript에서 처리)
      const processableItems = queueItems
        .filter((item) => !item.retryAfter || item.retryAfter <= now)
        .slice(0, 10); // 한 번에 10개씩 처리

      for (const queueItem of processableItems) {
        await this.processQueueItem(queueItem);
      }

      console.log(`✅ ${processableItems.length}개 큐 아이템 처리 완료`);
    } catch (error) {
      console.error('❌ 큐 처리 오류:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 개별 큐 아이템 처리 📋
   */
  private async processQueueItem(queueItem: UploadQueueItem): Promise<void> {
    const db = database.getDb();
    const maxAttempts = 3;
    const retryDelays = [30, 300, 900]; // 30초, 5분, 15분

    try {
      const data = JSON.parse(queueItem.data);
      let success = false;
      let serverId: string | undefined;

      // 저널 정보 조회
      const journal = await localJournalApi.getJournalById(queueItem.localJournalId);

      switch (queueItem.type) {
        case 'create_journal':
          console.log(`📝 저널 업로드 중: ${journal.localId}`);
          const createResult = await serverCreateJournal(data);
          serverId = createResult.id;
          success = true;
          break;

        case 'update_journal':
          if (!journal.serverId) {
            throw new Error('서버 ID 없이는 저널을 업데이트할 수 없습니다');
          }
          console.log(`✏️ 저널 수정 중: ${journal.serverId}`);
          await serverUpdateJournal(journal.serverId, journal.userId, data);
          success = true;
          break;

        case 'delete_journal':
          if (!journal.serverId) {
            console.log(`🔄 로컬 전용 저널의 공유 취소: ${journal.localId}`);
            success = true;
          } else {
            // 서버에서 공유 취소 (shared_groups를 빈 배열로 설정)
            console.log(`🚫 서버 저널 공유 취소 중: ${journal.serverId}`);
            await serverUpdateJournal(journal.serverId, journal.userId, {
              shared_groups: [], // 공유 그룹을 빈 배열로 설정
            });
            success = true;
          }
          break;
      }

      if (success) {
        // 성공 시 큐에서 제거하고 저널 동기화 상태 업데이트
        await db.transaction(async (tx) => {
          await tx.delete(schema.uploadQueue).where(eq(schema.uploadQueue.id, queueItem.id));

          if (serverId) {
            await localJournalApi.updateSyncStatus(journal.localId, 'synced', serverId);
          } else {
            await localJournalApi.updateSyncStatus(journal.localId, 'synced');
          }
        });

        console.log(`✅ 업로드 성공: ${queueItem.type} (저널: ${journal.localId})`);
      }
    } catch (error) {
      console.error(`❌ Failed to process queue item ${queueItem.id}:`, error);

      // 실패 시 재시도 로직
      const newAttempts = queueItem.attempts + 1;

      if (newAttempts >= maxAttempts) {
        // 최대 재시도 횟수 초과 시 에러 메시지 저장
        await db
          .update(schema.uploadQueue)
          .set({
            attempts: newAttempts,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          })
          .where(eq(schema.uploadQueue.id, queueItem.id));

        console.error(`💀 Max attempts reached for queue item ${queueItem.id}`);
      } else {
        // 재시도 시간 설정
        const delaySeconds = retryDelays[newAttempts - 1] || 900;
        const retryAfter = new Date(Date.now() + delaySeconds * 1000).toISOString();

        await db
          .update(schema.uploadQueue)
          .set({
            attempts: newAttempts,
            retryAfter,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          })
          .where(eq(schema.uploadQueue.id, queueItem.id));

        console.log(`⏰ Retry scheduled for queue item ${queueItem.id} in ${delaySeconds}s`);
      }
    }
  }

  /**
   * 네트워크 리스너 초기화 (데이터베이스 준비 후 호출) 🔗
   */
  initializeNetworkListener(): void {
    // 네트워크 상태 변경 시에만 큐 처리 및 동기화 (주기적 처리 제거)
    networkManager.addListener((state) => {
      if (state.isConnected && state.isInternetReachable) {
        console.log('🌐 네트워크 연결됨 - 큐 처리 및 동기화 시작');
        // 서버와 동기화 먼저 수행
        this.syncWithServer();
        // 그 다음 큐 처리
        this.processQueue();
      } else {
        console.log('📴 네트워크 연결 끊김 - 큐 처리 대기');
      }
    });

    console.log('🔗 네트워크 리스너 초기화 완료');
  }

  /**
   * 업로드 큐 통계 조회 📊
   */
  async getQueueStats(): Promise<QueueStats> {
    const db = database.getDb();
    const now = new Date().toISOString();

    const [totalResult, pendingResult, failedResult] = await Promise.all([
      db.select({ count: count() }).from(schema.uploadQueue),
      db.select({ count: count() }).from(schema.uploadQueue),
      db
        .select({ count: count() })
        .from(schema.uploadQueue)
        .where(eq(schema.uploadQueue.attempts, 3)), // 최대 재시도 횟수 도달
    ]);

    // JavaScript에서 pending 필터링
    const allItems = await db.select().from(schema.uploadQueue);
    const pendingItems = allItems.filter((item) => !item.retryAfter || item.retryAfter <= now);
    const processingItems = allItems.filter(
      (item) => item.retryAfter && item.retryAfter > now && item.attempts < 3
    );

    return {
      total: totalResult[0]?.count || 0,
      pending: pendingItems.length,
      failed: failedResult[0]?.count || 0,
      processing: processingItems.length,
      completed: 0, // 완료된 항목은 큐에서 제거되므로 항상 0
      lastProcessedAt: this.isProcessing ? now : undefined,
    };
  }

  /**
   * 업로드 큐 아이템 목록 조회 📋
   */
  async getQueueItems(): Promise<QueueItemWithJournal[]> {
    const db = database.getDb();
    const now = new Date();

    const queueItems = await db
      .select()
      .from(schema.uploadQueue)
      .orderBy(desc(schema.uploadQueue.createdAt));

    const result: QueueItemWithJournal[] = [];

    for (const item of queueItems) {
      try {
        const journal = await localJournalApi.getJournalById(item.localJournalId);

        let retryIn: number | undefined;
        if (item.retryAfter) {
          const retryTime = new Date(item.retryAfter);
          const diffMs = retryTime.getTime() - now.getTime();
          retryIn = Math.max(0, Math.floor(diffMs / 1000));
        }

        result.push({
          ...item,
          journal,
          retryIn,
        });
      } catch (error) {
        console.warn(`Failed to load journal for queue item ${item.id}:`, error);
        result.push({
          ...item,
          journal: undefined,
        });
      }
    }

    return result;
  }

  /**
   * 실패한 큐 아이템 재시도 🔄
   */
  async retryFailedItems(): Promise<void> {
    const db = database.getDb();
    const now = getCurrentTimestamp();

    // 실패한 아이템들의 재시도 시간 리셋
    await db
      .update(schema.uploadQueue)
      .set({
        retryAfter: null,
        attempts: 0,
        errorMessage: null,
      })
      .where(eq(schema.uploadQueue.attempts, 3));

    console.log('🔄 실패한 큐 아이템 재시도 준비 완료');

    // 즉시 처리 시도
    if (networkManager.isOnline()) {
      this.processQueue();
    }
  }

  /**
   * 업로드 큐 완전 초기화 🗑️
   */
  async clearQueue(): Promise<void> {
    const db = database.getDb();
    await db.delete(schema.uploadQueue);
    console.log('🗑️ 업로드 큐 초기화 완료');
  }

  /**
   * 특정 저널의 큐 아이템 제거 🎯
   */
  async removeQueueItemsForJournal(localJournalId: string): Promise<number> {
    const db = database.getDb();

    // 해당 저널의 모든 큐 아이템 제거
    const result = await db
      .delete(schema.uploadQueue)
      .where(eq(schema.uploadQueue.localJournalId, localJournalId));

    const deletedCount = result.changes || 0;
    console.log(`🎯 저널 ${localJournalId}의 큐 아이템 ${deletedCount}개 제거됨`);

    return deletedCount;
  }

  /**
   * 서버와 로컬 저널 동기화 📡
   */
  async syncWithServer(): Promise<void> {
    if (!networkManager.isOnline()) {
      console.log('🚫 오프라인 상태, 동기화 건너뜀');
      return;
    }

    try {
      console.log('📡 서버와 동기화 시작...');

      // 서버에 있는 그룹 공유 저널들과 로컬 저널 비교
      await this.checkServerDeletedJournals();

      console.log('✅ 서버 동기화 완료');
    } catch (error) {
      console.error('❌ 서버 동기화 오류:', error);
    }
  }

  /**
   * 서버에서 삭제된 저널 감지 및 로컬 처리 🔍
   */
  private async checkServerDeletedJournals(): Promise<void> {
    try {
      // 로컬에서 서버 ID가 있는 (공유된) 저널들 조회
      const db = database.getDb();
      const localSharedJournals = await db
        .select()
        .from(schema.localJournals)
        .where(
          and(eq(schema.localJournals.isShared, true), isNotNull(schema.localJournals.serverId))
        );

      if (localSharedJournals.length === 0) {
        console.log('📝 공유된 로컬 저널이 없음');
        return;
      }

      console.log(`📝 ${localSharedJournals.length}개의 공유 저널 확인 중...`);

      // 서버 ID 목록 수집
      const serverIds = localSharedJournals
        .map((journal) => journal.serverId)
        .filter((id) => id !== null);

      if (serverIds.length === 0) {
        return;
      }

      // 서버에서 해당 저널들이 여전히 존재하는지 확인
      const { data: serverJournals, error } = await supabase
        .from('journals')
        .select('id')
        .in('id', serverIds);

      if (error) {
        console.error('서버 저널 조회 오류:', error);
        return;
      }

      const existingServerIds = new Set(serverJournals?.map((j: any) => j.id) || []);

      // 서버에서 삭제된 저널들 찾기
      const deletedJournals = localSharedJournals.filter(
        (journal) => journal.serverId && !existingServerIds.has(journal.serverId)
      );

      if (deletedJournals.length > 0) {
        console.log(`🗑️ ${deletedJournals.length}개의 서버 삭제 저널 감지`);

        for (const journal of deletedJournals) {
          await this.handleServerDeletedJournal(journal);
        }
      }
    } catch (error) {
      console.error('서버 삭제 저널 확인 오류:', error);
    }
  }

  /**
   * 서버에서 삭제된 저널을 로컬에서 처리 🔄
   */
  private async handleServerDeletedJournal(journal: LocalJournal): Promise<void> {
    try {
      const db = database.getDb();

      // 옵션 1: 로컬에서도 삭제
      // await localJournalApi.deleteJournal(journal.localId);

      // 옵션 2: 공유 상태만 해제 (선택한 방식)
      await db
        .update(schema.localJournals)
        .set({
          serverId: null,
          isShared: false,
          sharedGroups: '[]',
          syncStatus: 'local',
          lastModifiedAt: getCurrentTimestamp(),
        })
        .where(eq(schema.localJournals.localId, journal.localId));

      console.log(`📝 저널 ${journal.localId} 공유 상태 해제됨`);

      // 사용자에게 알림
      Toast.show({
        type: 'info',
        text1: '공유 취소됨',
        text2: `${journal.date} 일기의 그룹 공유가 취소되었습니다.`,
        visibilityTime: 4000,
      });
    } catch (error) {
      console.error(`저널 ${journal.localId} 처리 오류:`, error);
    }
  }
}

// 업로드 큐 매니저 싱글톤 인스턴스
export const uploadQueueManager = UploadQueueManager.getInstance();
