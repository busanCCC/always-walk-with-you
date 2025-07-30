import {
  useQuery,
  keepPreviousData,
  useQueries,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  fetchJournalsByDateRange,
  fetchJournalById,
  fetchEmotions,
  createJournal,
  deleteJournal,
  updateJournal,
  fetchGroupJournals,
  checkJournalExistsForDate,
} from '@/apis/journalApi';
import { getAllQuestions, DifficultyLevel, Question } from '@/utils/questionUtils';
import { useQuestionStore } from '@/store/questionStore';
import { fetchUserGroups } from '@/apis/groupApi';
import {
  syncEmotionsFromServer,
  getLocalEmotions,
  convertToEmotions,
  shouldSyncEmotions,
  forceSyncEmotions,
  clearEmotionsCache,
  getEmotionsCacheInfo,
} from '@/utils/emotionStorage';
import { localJournalApi } from '@/apis/localJournalApiDrizzle';
import Toast from 'react-native-toast-message';
import { Journal } from '@/types/journal';
import { UserGroup } from '@/types/group';
import { useAuthStore } from '@/store/authStore';
import { getSunday, formatDate } from '@/utils/dateUtils';
import { networkManager } from '@/utils/networkManager';
import { supabase } from '@/utils/supabaseClient';

export const journalQueryKeys = {
  all: ['journals'] as const,
  list: (startDate: string, endDate: string, userId?: string) =>
    [...journalQueryKeys.all, 'list', { startDate, endDate, userId }] as const,
  monthlyList: (year: number, month: number, userId?: string) =>
    [...journalQueryKeys.all, 'monthlyList', { year, month, userId }] as const,
  detail: (id: string) => [...journalQueryKeys.all, 'detail', id] as const,
};

// 🗄️ 로컬 DB 기반 주간 일기 쿼리
export const useWeeklyJournalsQuery = () => {
  const userId = useAuthStore((state) => state.session?.user?.id);

  const today = new Date();
  const sunday = getSunday(today);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  const startDate = formatDate(sunday);
  const endDate = formatDate(saturday);

  return useQuery<Journal[], Error>({
    queryKey: ['localJournals', 'weekly', startDate, endDate, userId],
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      try {
        // 1. 로컬 DB에서 주간 일기 가져오기
        const localJournals = await localJournalApi.getJournalsWithDetailsByDateRange(
          userId,
          startDate,
          endDate
        );

        // 2. 감정 데이터 가져오기 (캐시된 데이터 사용)
        const emotions = await getLocalEmotions();
        const emotionsMap = new Map(emotions.map((e) => [e.id, e]));

        // 3. 로컬 일기를 Journal 형태로 변환하면서 감정 정보 추가
        const journals: Journal[] = localJournals.map((localJournal) => {
          const emotion = localJournal.emotionId ? emotionsMap.get(localJournal.emotionId) : null;

          return {
            id: localJournal.serverId || localJournal.localId,
            user_id: localJournal.userId,
            date: localJournal.date,
            mode: localJournal.mode,
            emotion_id: localJournal.emotionId,
            shared_groups: localJournal.sharedGroups ? JSON.parse(localJournal.sharedGroups) : [],
            created_at: localJournal.createdLocallyAt,
            updated_at: localJournal.lastModifiedAt,
            emotion: emotion
              ? {
                  id: emotion.id,
                  name: emotion.name,
                  img_url: emotion.local_img_path || emotion.img_url,
                  description: emotion.description,
                  created_at: emotion.created_at,
                  updated_at: emotion.updated_at,
                }
              : null,
            journal_entries:
              localJournal.entries?.map((entry: any) => ({
                id: entry.serverId || entry.localId || entry.id,
                journal_id: entry.serverJournalId || entry.localJournalId || entry.journal_id,
                entry_type: entry.entryType || entry.entry_type,
                text_content: entry.textContent || entry.text_content,
                entry_order: entry.entryOrder || entry.entry_order,
                created_at: entry.createdAt || entry.created_at,
                updated_at: entry.updatedAt || entry.updated_at,
              })) || [],
            user: null, // 홈 화면에서는 사용자 정보 불필요
          };
        });

        return journals;
      } catch (error) {
        console.error('Failed to fetch local weekly journals:', error);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 2, // 2분 캐시 (로컬 데이터이므로 짧게)
    refetchOnMount: true, // 마운트 시 새 데이터 가져오기
    refetchOnWindowFocus: true, // 포커스 시 새 데이터 가져오기
  });
};

/**
 * 🗄️ 로컬 DB 기반 월간 일기 쿼리
 * @param year 조회할 연도 (e.g., 2024)
 * @param month 조회할 월 (1-12)
 */
export const useMonthlyJournalsQuery = (year: number, month: number) => {
  const userId = useAuthStore((state) => state.session?.user?.id);

  // 해당 월의 시작일과 마지막 날 계산
  const startDate = formatDate(new Date(year, month - 1, 1));
  const endDate = formatDate(new Date(year, month, 0)); // 다음 달의 0번째 날은 해당 월의 마지막 날

  return useQuery<Journal[], Error>({
    queryKey: ['localJournals', 'monthly', year, month, userId],
    queryFn: async () => {
      if (!userId) {
        return [];
      }

      try {
        // 1. 로컬 DB에서 월간 일기 가져오기
        const localJournals = await localJournalApi.getJournalsWithDetailsByDateRange(
          userId,
          startDate,
          endDate
        );

        // 2. 감정 데이터 가져오기 (캐시된 데이터 사용)
        const emotions = await getLocalEmotions();
        const emotionsMap = new Map(emotions.map((e) => [e.id, e]));

        // 3. 로컬 일기를 Journal 형태로 변환하면서 감정 정보 추가
        const journals: Journal[] = localJournals.map((localJournal) => {
          const emotion = localJournal.emotionId ? emotionsMap.get(localJournal.emotionId) : null;

          return {
            id: localJournal.serverId || localJournal.localId,
            user_id: localJournal.userId,
            date: localJournal.date,
            mode: localJournal.mode,
            emotion_id: localJournal.emotionId,
            shared_groups: localJournal.sharedGroups ? JSON.parse(localJournal.sharedGroups) : [],
            created_at: localJournal.createdLocallyAt,
            updated_at: localJournal.lastModifiedAt,
            emotion: emotion
              ? {
                  id: emotion.id,
                  name: emotion.name,
                  img_url: emotion.local_img_path || emotion.img_url,
                  description: emotion.description,
                  created_at: emotion.created_at,
                  updated_at: emotion.updated_at,
                }
              : null,
            journal_entries:
              localJournal.entries?.map((entry: any) => ({
                id: entry.serverId || entry.localId || entry.id,
                journal_id: entry.serverJournalId || entry.localJournalId || entry.journal_id,
                entry_type: entry.entryType || entry.entry_type,
                text_content: entry.textContent || entry.text_content,
                entry_order: entry.entryOrder || entry.entry_order,
                created_at: entry.createdAt || entry.created_at,
                updated_at: entry.updatedAt || entry.updated_at,
              })) || [],
            user: null,
          };
        });

        return journals;
      } catch (error) {
        console.error('Failed to fetch local monthly journals:', error);
        return [];
      }
    },
    enabled: !!userId && year > 0 && month > 0 && month <= 12,
    staleTime: 1000 * 60 * 2, // 2분 캐시 (로컬 데이터이므로 짧게)
    placeholderData: keepPreviousData,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
};

// 🗄️ 로컬 DB 기반 개별 일기 상세 조회 쿼리
export const useJournalDetailQuery = (journalId: string) => {
  const userId = useAuthStore((state) => state.session?.user?.id);

  return useQuery<Journal, Error>({
    queryKey: ['localJournals', 'detail', journalId],
    queryFn: async () => {
      if (!userId) {
        throw new Error('사용자 ID가 없어 상세 정보를 가져올 수 없습니다.');
      }

      try {
        // 1. 로컬 DB에서 일기 조회 시도
        let localJournal;

        try {
          // journalId가 localId인 경우
          localJournal = await localJournalApi.getJournalById(journalId);

          // 공유된 저널인 경우 서버 상태 확인
          if (localJournal.serverId && localJournal.sharedGroups && networkManager.isOnline()) {
            try {
              const { data: serverJournal, error } = await supabase
                .from('journals')
                .select('id')
                .eq('id', localJournal.serverId)
                .single();

              if (error || !serverJournal) {
                // 서버에서 삭제된 저널 - 로컬에서 공유 해제
                console.log(`🗑️ 서버에서 삭제된 저널 발견: ${localJournal.localId}`);

                await localJournalApi.updateSyncStatus(localJournal.localId, 'local', undefined, {
                  serverDeleted: true,
                  deletedAt: new Date().toISOString(),
                  reason: '서버에서 삭제됨',
                });

                // 공유 그룹 정보도 제거
                await localJournalApi.updateJournal(localJournal.localId, {
                  shared_groups: [],
                });

                // 업데이트된 저널 정보 다시 가져오기
                localJournal = await localJournalApi.getJournalById(journalId);
              }
            } catch (syncError) {
              console.error('서버 상태 확인 중 오류:', syncError);
            }
          }
        } catch (localError) {
          // 로컬에서 찾을 수 없는 경우 서버에서 시도 (온라인일 때만)
          console.log('로컬 일기 없음, 서버에서 시도...');

          if (!networkManager.isOnline()) {
            throw new Error('오프라인 상태에서는 해당 일기를 찾을 수 없습니다.');
          }

          try {
            const serverJournal = await fetchJournalById(journalId);

            // 서버 일기를 로컬 형식으로 변환 (메모리에서만)
            localJournal = {
              localId: `server_${journalId}`,
              serverId: journalId,
              userId: serverJournal.user_id,
              date: serverJournal.date,
              mode: serverJournal.mode,
              emotionId: serverJournal.emotion_id,
              sharedGroups: JSON.stringify(serverJournal.shared_groups || []),
              syncStatus: 'synced' as const,
              createdLocallyAt: serverJournal.created_at,
              lastModifiedAt: serverJournal.updated_at,
              isShared: (serverJournal.shared_groups || []).length > 0,
              entries: serverJournal.journal_entries || [],
            };
          } catch (serverError) {
            console.error('서버에서도 일기를 찾을 수 없음:', serverError);
            throw new Error(
              '해당 일기를 찾을 수 없습니다. 삭제되었거나 접근 권한이 없을 수 있습니다.'
            );
          }
        }

        // 2. 감정 데이터 가져오기
        const emotions = await getLocalEmotions();
        const emotion = localJournal.emotionId
          ? emotions.find((e) => e.id === localJournal.emotionId)
          : null;

        // 3. Journal 형태로 변환
        const journal: Journal = {
          id: localJournal.serverId || localJournal.localId,
          user_id: localJournal.userId,
          date: localJournal.date,
          mode: localJournal.mode,
          emotion_id: localJournal.emotionId,
          shared_groups: localJournal.sharedGroups ? JSON.parse(localJournal.sharedGroups) : [],
          created_at: localJournal.createdLocallyAt,
          updated_at: localJournal.lastModifiedAt,
          emotion: emotion
            ? {
                id: emotion.id,
                name: emotion.name,
                img_url: emotion.local_img_path || emotion.img_url,
                description: emotion.description,
                created_at: emotion.created_at,
                updated_at: emotion.updated_at,
              }
            : null,
          journal_entries:
            localJournal.entries?.map((entry: any) => ({
              id: entry.serverId || entry.localId || entry.id,
              journal_id: entry.serverJournalId || entry.localJournalId || entry.journal_id,
              entry_type: entry.entryType || entry.entry_type,
              text_content: entry.textContent || entry.text_content,
              entry_order: entry.entryOrder || entry.entry_order,
              created_at: entry.createdAt || entry.created_at,
              updated_at: entry.updatedAt || entry.updated_at,
            })) || [],
          user: null, // 상세 화면에서는 작성자 정보 불필요
        };

        return journal;
      } catch (error) {
        console.error('Failed to fetch journal detail:', error);
        throw new Error('일기를 불러올 수 없습니다.');
      }
    },
    enabled: !!journalId && !!userId,
    staleTime: 1000 * 60 * 2, // 2분 캐시
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

/**
 * 감정 데이터를 로컬 캐시 우선으로 가져오는 함수
 */
const fetchEmotionsWithCache = async () => {
  try {
    // 1. 먼저 로컬 캐시에서 감정 데이터 가져오기
    const localEmotions = await getLocalEmotions();

    // 2. 로컬 데이터가 있으면 우선 반환
    if (localEmotions.length > 0) {
      console.log('📱 Using cached emotions from local storage');

      // 백그라운드에서 동기화 필요성 확인
      const needsSync = await shouldSyncEmotions();
      if (needsSync) {
        console.log('🔄 Background sync needed for emotions');
        // 백그라운드에서 동기화 실행 (결과는 무시)
        syncEmotionsFromServer().catch((error) => {
          console.warn('Background emotions sync failed:', error);
        });
      }

      return convertToEmotions(localEmotions);
    }

    // 3. 로컬 데이터가 없으면 서버에서 동기화
    console.log('🌐 No local emotions found, syncing from server...');
    const syncedEmotions = await syncEmotionsFromServer();
    return convertToEmotions(syncedEmotions);
  } catch (error) {
    console.error('❌ Error in fetchEmotionsWithCache:', error);

    // 최후의 수단으로 서버에서 직접 가져오기
    try {
      return await fetchEmotions();
    } catch (serverError) {
      console.error('❌ Server fetch also failed:', serverError);
      throw serverError;
    }
  }
};

/**
 * 모든 감정 데이터를 가져오는 쿼리 훅 (로컬 캐시 우선)
 */
export const useEmotionsQuery = () => {
  return useQuery({
    queryKey: ['emotions'],
    queryFn: fetchEmotionsWithCache,
    staleTime: 1000 * 60 * 60 * 24, // 24시간 동안 fresh 상태 유지
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7일간 가비지 컬렉션하지 않음
    refetchOnMount: false, // 마운트 시 자동 refetch 비활성화 (로컬 캐시 우선)
    refetchOnWindowFocus: false, // 윈도우 포커스 시 refetch 비활성화
    retry: (failureCount, error) => {
      // 최대 2번 재시도
      if (failureCount < 2) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // 최대 5초
  });
};

/**
 * 감정 데이터 강제 동기화 뮤테이션
 */
export const useForceSyncEmotionsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const syncedEmotions = await forceSyncEmotions();
      return convertToEmotions(syncedEmotions);
    },
    onSuccess: (emotions) => {
      // 캐시된 감정 데이터 업데이트
      queryClient.setQueryData(['emotions'], emotions);
      console.log('✅ Emotions cache updated after force sync');
    },
    onError: (error) => {
      console.error('❌ Force sync emotions failed:', error);
    },
  });
};

/**
 * 감정 캐시 클리어 뮤테이션
 */
export const useClearEmotionsCacheMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: clearEmotionsCache,
    onSuccess: () => {
      // React Query 캐시도 클리어
      queryClient.removeQueries({ queryKey: ['emotions'] });
      console.log('✅ Emotions cache cleared');
    },
    onError: (error) => {
      console.error('❌ Clear emotions cache failed:', error);
    },
  });
};

/**
 * 감정 캐시 정보 조회 쿼리
 */
export const useEmotionsCacheInfoQuery = () => {
  return useQuery({
    queryKey: ['emotions-cache-info'],
    queryFn: getEmotionsCacheInfo,
    staleTime: 0, // 항상 최신 정보 조회
    gcTime: 0, // 캐시하지 않음
  });
};

/**
 * 난이도와 날짜에 따른 질문 데이터를 가져오는 쿼리 훅
 */
export const useQuestionsQuery = (date?: Date) => {
  const difficulty = useQuestionStore((state) => state.difficulty);

  return useQuery<Question[], Error>({
    queryKey: ['questions', difficulty, date?.toDateString() || new Date().toDateString()],
    queryFn: async () => {
      // 난이도와 날짜에 따른 질문들을 가져옴 (1번은 매일 변경, 2,3,4번은 고정)
      return Promise.resolve(getAllQuestions(difficulty, date));
    },
    staleTime: 1000 * 60 * 60 * 24, // 24시간 캐시 (하루 단위로 변경)
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7일간 가비지 컬렉션하지 않음
  });
};

/**
 * 현재 사용자가 속한 그룹들을 가져오는 쿼리 훅 (순 공유용)
 */
export const useUserGroupsForSharing = () => {
  const userId = useAuthStore((state) => state.session?.user?.id);

  return useQuery<UserGroup[], Error>({
    queryKey: ['userGroupsForSharing', userId],
    queryFn: async () => {
      if (!userId) {
        return [];
      }
      return fetchUserGroups(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
};

/**
 * 새로운 일기를 생성하는 mutation 훅
 */
export const useCreateJournalMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createJournal,
    onSuccess: (data) => {
      // 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: journalQueryKeys.all });

      // 만약 그룹에 공유되었다면 해당 그룹의 일기 목록도 무효화
      if (data.shared_groups && data.shared_groups.length > 0) {
        data.shared_groups.forEach((groupId) => {
          queryClient.invalidateQueries({ queryKey: ['groupJournals', groupId] });
        });
      }
    },
  });
};

/**
 * 🗄️ 로컬 DB 기반 일기 삭제 mutation 훅
 */
export const useDeleteJournalMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ journalId, userId }: { journalId: string; userId: string }) => {
      // journalId가 local_으로 시작하면 로컬 일기
      const isLocalJournal = journalId.startsWith('local_');

      if (isLocalJournal) {
        // 로컬 일기인 경우 - 서버 공유 여부 확인 필요
        console.log(`🗑️ Deleting local journal: ${journalId}`);

        // 1. 먼저 로컬 DB에서 일기 정보 조회 (serverId 확인)
        const localJournal = await localJournalApi.getJournalById(journalId);

        if (localJournal.serverId) {
          // 서버에도 공유된 일기인 경우 - 온라인에서만 삭제 가능
          console.log(
            `🌐 서버에도 공유된 일기 (serverId: ${localJournal.serverId}) - 서버에서도 삭제`
          );

          if (!networkManager.isOnline()) {
            throw new Error('그룹 공유 글 삭제는 온라인 상태에서만 가능합니다.');
          }

          // 온라인: 즉시 서버에서 삭제
          try {
            await deleteJournal(localJournal.serverId, userId);
            console.log(`✅ 서버 일기 삭제 완료: ${localJournal.serverId}`);
          } catch (serverError) {
            console.error(`❌ 서버 일기 삭제 실패: ${localJournal.serverId}`, serverError);
            throw new Error('서버에서 일기 삭제에 실패했습니다.');
          }
        }

        // 2. 로컬에서 삭제
        await localJournalApi.deleteJournal(journalId);

        // 상황에 따른 토스트 메시지
        const toastMessage = localJournal.serverId
          ? '로컬과 서버에서 모두 삭제되었습니다.'
          : '로컬 일기가 삭제되었습니다.';

        Toast.show({
          type: 'success',
          text1: '일기 삭제 완료',
          text2: toastMessage,
          position: 'bottom',
        });
      } else {
        // 서버 일기 삭제 - 서버와 로컬 둘 다 체크
        console.log(`🗑️ Deleting server journal: ${journalId}`);

        try {
          // 1. 서버에서 삭제
          await deleteJournal(journalId, userId);

          // 2. 로컬에도 해당 serverId를 가진 일기이 있다면 삭제
          try {
            // serverId로 로컬 일기 찾기 (구현되어 있다면)
            // 현재는 serverId로 직접 삭제하는 메서드가 없으므로 스킵
            console.log('✅ Server journal deleted successfully');
          } catch (localError) {
            // 로컬에 해당 일기이 없는 경우 - 정상적인 상황
            console.log('Local journal not found - normal for server-only journals');
          }

          Toast.show({
            type: 'success',
            text1: '일기 삭제 완료',
            text2: '일기가 삭제되었습니다.',
            position: 'bottom',
          });
        } catch (error) {
          console.error('❌ Failed to delete server journal:', error);
          Toast.show({
            type: 'error',
            text1: '삭제 실패',
            text2: '일기 삭제 중 오류가 발생했습니다.',
            position: 'bottom',
          });
          throw error;
        }
      }

      return journalId;
    },
    onSuccess: (journalId) => {
      // 캐시 무효화 - 로컬 DB 기반 쿼리들
      queryClient.removeQueries({ queryKey: ['localJournals', 'detail', journalId] });

      // 모든 로컬 일기 쿼리 무효화
      queryClient.invalidateQueries({
        queryKey: ['localJournals'],
        refetchType: 'active', // 현재 활성 쿼리만 다시 가져오기
      });

      // 그룹 일기 캐시도 무효화 (공유된 일기였을 수 있으므로)
      queryClient.invalidateQueries({ queryKey: ['groupJournals'] });

      console.log(`✅ Journal deleted and cache invalidated: ${journalId}`);
    },
    onError: (error, { journalId }) => {
      console.error(`❌ Failed to delete journal ${journalId}:`, error);
    },
  });
};

/**
 * 일기를 수정하는 mutation 훅
 */
export const useUpdateJournalMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      journalId,
      userId,
      updateData,
      originalSharedGroups,
    }: {
      journalId: string;
      userId: string;
      updateData: {
        emotion_id?: string;
        content?: string;
        answers?: Array<{ answer: string; order: number }>;
        shared_groups?: string[];
      };
      originalSharedGroups?: string[];
    }) => updateJournal(journalId, userId, updateData),
    onSuccess: (updatedJournal, { updateData, originalSharedGroups }) => {
      // 관련 쿼리들 무효화
      queryClient.setQueryData(journalQueryKeys.detail(updatedJournal.id), updatedJournal);
      queryClient.invalidateQueries({ queryKey: journalQueryKeys.all });

      // 그룹 공유가 변경된 경우 그룹 일기 캐시 무효화
      if (updateData.shared_groups !== undefined) {
        // 기존 공유 그룹들의 캐시 무효화
        if (originalSharedGroups && originalSharedGroups.length > 0) {
          originalSharedGroups.forEach((groupId) => {
            queryClient.invalidateQueries({ queryKey: ['groupJournals', groupId] });
          });
        }

        // 새로 공유된 그룹들의 캐시 무효화
        if (updateData.shared_groups.length > 0) {
          updateData.shared_groups.forEach((groupId) => {
            queryClient.invalidateQueries({ queryKey: ['groupJournals', groupId] });
          });
        }
      }
    },
  });
};

/**
 * 그룹에 공유된 일기들을 가져오는 쿼리 훅
 */
export const useGroupJournals = (groupId: string | undefined) => {
  return useQuery({
    queryKey: ['groupJournals', groupId],
    queryFn: () => fetchGroupJournals(groupId!),
    enabled: !!groupId,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
};

/**
 * 특정 날짜에 사용자의 일기가 이미 존재하는지 확인하는 쿼리 훅
 */
export const useJournalExistsForDate = (date: string) => {
  const userId = useAuthStore((state) => state.session?.user?.id);

  return useQuery({
    queryKey: ['journalExists', userId, date],
    queryFn: () => checkJournalExistsForDate(userId!, date),
    enabled: !!userId && !!date,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
};
