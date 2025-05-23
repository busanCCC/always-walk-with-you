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

/**
 * 특정 ID의 영성일기 상세 정보를 가져옵니다.
 * @param journalId 조회할 영성일기의 ID
 */
export const fetchJournalById = async (journalId: string): Promise<Journal> => {
  if (!journalId) {
    console.error('Journal ID not provided, cannot fetch journal detail');
    throw new Error('Journal ID is required.');
  }

  try {
    const { data, error } = await supabase
      .from('journals')
      .select(
        `
        *,
        user_id,
        emotions (*)
      `
      )
      .eq('id', journalId)
      .single(); // 단일 행을 가져옴

    if (error) {
      console.error('Error fetching journal by ID:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Journal not found.');
    }

    const rawData = data as RawJournalData;

    const journalWithEmotion: Journal = {
      ...rawData,
      emotion: Array.isArray(rawData.emotions) ? rawData.emotions[0] : rawData.emotions,
    };

    return journalWithEmotion;
  } catch (err) {
    console.error('An unexpected error occurred while fetching journal detail:', err);
    // 에러 타입에 따라 적절한 에러 객체를 throw 하거나, null 또는 undefined 반환 후 UI에서 처리
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Failed to fetch journal detail.');
  }
};
