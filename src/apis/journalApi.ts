import { supabase } from '../utils/supabaseClient';
import { Journal, Emotion } from '../types/journal';
import { useAuthStore } from '@/store/authStore';
import { getSunday, formatDate } from '../utils/dateUtils'; // 수정된 경로

// Supabase에서 반환될 수 있는 raw journal 타입 (emotion이 배열일 수 있음)
interface RawJournalData extends Omit<Journal, 'emotion'> {
  emotions: Emotion | Emotion[] | null; // Supabase join 결과를 받을 필드명
}

/**
 * 특정 기간 동안의 영성일기를 가져옵니다.
 * @param startDate 조회 시작 날짜 (YYYY-MM-DD)
 * @param endDate 조회 종료 날짜 (YYYY-MM-DD)
 * @param userId 사용자 ID
 */
export const fetchJournalsByDateRange = async (
  startDate: string,
  endDate: string,
  userId: string
): Promise<Journal[]> => {
  if (!userId) {
    console.error('User ID not provided, cannot fetch journals');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('journals')
      .select(
        `
        *,
        emotions (*)
      `
      )
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching journals by date range:', error);
      throw error;
    }

    const rawData = data as RawJournalData[] | null;

    const journalsWithEmotion: Journal[] =
      rawData?.map(
        (j: RawJournalData): Journal => ({
          ...j,
          emotion: Array.isArray(j.emotions) ? j.emotions[0] : j.emotions,
        })
      ) || [];

    return journalsWithEmotion;
  } catch (err) {
    console.error('An unexpected error occurred while fetching journals:', err);
    return [];
  }
};
