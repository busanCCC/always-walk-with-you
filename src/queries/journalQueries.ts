import { useQuery } from '@tanstack/react-query';
import { fetchJournalsByDateRange } from '../apis/journalApi';
import { Journal } from '../types/journal';
import { useAuthStore } from '@/store/authStore';
import { getSunday, formatDate } from '../utils/dateUtils';

export const journalQueryKeys = {
  all: ['journals'] as const,
  list: (startDate: string, endDate: string, userId?: string) =>
    [...journalQueryKeys.all, 'list', { startDate, endDate, userId }] as const,
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
        // enabled 옵션으로 userId가 없을 때 쿼리 실행을 막을 수도 있지만,
        // queryFn 내부에서 명시적으로 빈 배열을 반환하거나 에러를 던질 수도 있습니다.
        return [];
      }
      return fetchJournalsByDateRange(startDate, endDate, userId);
    },
    enabled: !!userId, // userId가 있을 때만 쿼리 실행
    staleTime: 1000 * 60 * 5, // 5분 동안은 fresh 상태로 간주 (캐시된 데이터 사용)
    // placeholderData: [], // 초기 로딩 시 보여줄 플레이스홀더 데이터 (옵션)
  });
};

// 만약 개별 Journal을 가져오는 API가 있다면:
// export const useJournalDetailQuery = (journalId: string) => {
//   return useQuery<Journal, Error>({
//     queryKey: journalQueryKeys.detail(journalId),
//     queryFn: async () => fetchJournalById(journalId), // fetchJournalById API 함수 필요
//     enabled: !!journalId,
//   });
// };
