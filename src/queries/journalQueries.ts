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
} from '../apis/journalApi';
import questionsData from '../assets/data/questions.json';
import { Question } from '../types/journal';
import { fetchUserGroups } from '../apis/groupApi';
import { Journal } from '../types/journal';
import { UserGroup } from '../types/group';
import { useAuthStore } from '@/store/authStore';
import { getSunday, formatDate } from '../utils/dateUtils';

export const journalQueryKeys = {
  all: ['journals'] as const,
  list: (startDate: string, endDate: string, userId?: string) =>
    [...journalQueryKeys.all, 'list', { startDate, endDate, userId }] as const,
  monthlyList: (year: number, month: number, userId?: string) =>
    [...journalQueryKeys.all, 'monthlyList', { year, month, userId }] as const,
  detail: (id: string) => [...journalQueryKeys.all, 'detail', id] as const,
};

export const useWeeklyJournalsQuery = () => {
  const userId = useAuthStore((state) => state.session?.user?.id);

  // 날짜 계산 로직은 쿼리 함수 내부 또는 useQuery의 enabled 옵션 등에서 처리 가능
  // 여기서는 queryFn 내부에서 계산합니다.
  const today = new Date();
  const sunday = getSunday(today);
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  const startDate = formatDate(sunday);
  const endDate = formatDate(saturday);

  return useQuery<Journal[], Error>({
    queryKey: journalQueryKeys.list(startDate, endDate, userId),
    queryFn: async () => {
      if (!userId) {
        return [];
      }
      return fetchJournalsByDateRange(startDate, endDate, userId);
    },
    enabled: !!userId, // userId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 5, // 5분 동안은 fresh 상태로 간주 (캐시된 데이터 사용)
    // placeholderData: [], // 초기 로딩 시 보여줄 플레이스홀더 데이터 (옵션)
  });
};

/**
 * 특정 연도와 월의 영성일기 목록을 가져오는 react-query 훅
 * @param year 조회할 연도 (e.g., 2024)
 * @param month 조회할 월 (1-12)
 */
export const useMonthlyJournalsQuery = (year: number, month: number) => {
  const userId = useAuthStore((state) => state.session?.user?.id);

  // 해당 월의 시작일과 마지막 날 계산
  // month는 0 (January) 부터 11 (December)까지의 값을 사용하므로, 전달받은 month에서 1을 빼줍니다.
  const startDate = formatDate(new Date(year, month - 1, 1));
  const endDate = formatDate(new Date(year, month, 0)); // 다음 달의 0번째 날은 해당 월의 마지막 날

  return useQuery<Journal[], Error>({
    queryKey: journalQueryKeys.monthlyList(year, month, userId),
    queryFn: async () => {
      if (!userId) {
        return [];
      }
      return fetchJournalsByDateRange(startDate, endDate, userId);
    },
    enabled: !!userId && year > 0 && month > 0 && month <= 12, // 유효한 userId와 연/월일 때만 실행
    staleTime: 1000 * 60 * 5, // 5분
    placeholderData: keepPreviousData, // 이전 데이터를 유지 (v5 방식)
  });
};

// 만약 개별 Journal을 가져오는 API가 있다면:
export const useJournalDetailQuery = (journalId: string) => {
  const userId = useAuthStore((state) => state.session?.user?.id);
  return useQuery<Journal, Error>({
    queryKey: journalQueryKeys.detail(journalId),
    queryFn: async () => {
      if (!userId) {
        throw new Error('사용자 ID가 없어 상세 정보를 가져올 수 없습니다.');
      }
      return fetchJournalById(journalId);
    },
    enabled: !!journalId && !!userId,
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * 모든 감정 데이터를 가져오는 쿼리 훅
 */
export const useEmotionsQuery = () => {
  return useQuery({
    queryKey: ['emotions'],
    queryFn: fetchEmotions,
    staleTime: 1000 * 60 * 60, // 1시간 캐시
  });
};

/**
 * 모든 질문 데이터를 가져오는 쿼리 훅 (로컬 JSON 사용)
 */
export const useQuestionsQuery = () => {
  return useQuery<Question[], Error>({
    queryKey: ['questions'],
    queryFn: async () => {
      // 로컬 JSON 데이터를 Promise로 래핑하여 반환
      return Promise.resolve(questionsData as Question[]);
    },
    staleTime: Infinity, // 로컬 데이터이므로 캐시를 계속 유지
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
 * 새로운 저널을 생성하는 mutation 훅
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
 * 저널을 삭제하는 mutation 훅
 */
export const useDeleteJournalMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ journalId, userId }: { journalId: string; userId: string }) =>
      deleteJournal(journalId, userId),
    onSuccess: (_, { journalId }) => {
      queryClient.removeQueries({ queryKey: journalQueryKeys.detail(journalId) });

      queryClient.invalidateQueries({
        queryKey: journalQueryKeys.all,
        predicate: (query) => {
          return !query.queryKey.includes('detail');
        },
      });

      // 모든 그룹 일기 캐시 무효화 (어떤 그룹에 공유되었는지 모르므로)
      queryClient.invalidateQueries({ queryKey: ['groupJournals'] });
    },
  });
};

/**
 * 저널을 수정하는 mutation 훅
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
