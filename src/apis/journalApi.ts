import { supabase } from '../utils/supabaseClient';
import { Journal, Emotion, JournalEntry, JournalEntryType } from '../types/journal';
import { useAuthStore } from '@/store/authStore';
import { getSunday, formatDate } from '../utils/dateUtils'; // 수정된 경로

// Supabase에서 반환될 수 있는 raw journal 타입
interface RawJournalData extends Omit<Journal, 'emotion' | 'journal_entries'> {
  emotions: Emotion | Emotion[] | null; // Supabase join 결과를 받을 필드명
  journal_entries: JournalEntry[] | null; // Supabase join 결과를 받을 필드명
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
        emotions (*),
        journal_entries (*)
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

    const journalsWithDetails: Journal[] =
      rawData?.map(
        (j: RawJournalData): Journal => ({
          ...j,
          emotion: Array.isArray(j.emotions) ? j.emotions[0] : j.emotions,
          journal_entries: j.journal_entries || [],
        })
      ) || [];

    return journalsWithDetails;
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

  console.log(`Fetching journal detail for ID: ${journalId}`); // 조회 시도 ID 로깅

  try {
    const { data, error } = await supabase
      .from('journals')
      .select(
        `
        *,
        user_id,
        emotions (*),
        journal_entries (*)
      `
      )
      .eq('id', journalId)
      .order('entry_order', { foreignTable: 'journal_entries', ascending: true })
      .single();

    if (error) {
      console.error(`Error fetching journal by ID (${journalId}):`, error);
      throw error;
    }

    if (!data) {
      // .single() 호출 시 데이터가 없으면 error 객체가 PGRST116 코드를 포함하여 반환되지만,
      // 명시적으로 data가 null인 경우도 처리합니다.
      const errorMessage = `Journal not found with ID: ${journalId}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }

    const rawData = data as RawJournalData;

    const journalWithDetails: Journal = {
      ...rawData,
      emotion: Array.isArray(rawData.emotions) ? rawData.emotions[0] : rawData.emotions,
      journal_entries: rawData.journal_entries || [],
    };

    return journalWithDetails;
  } catch (err) {
    // 이미 위에서 console.error를 호출했으므로, 여기서는 일반적인 에러를 처리합니다.
    // console.error(`An unexpected error occurred while fetching journal detail for ID ${journalId}:`, err); // 중복 로그 피하기
    if (err instanceof Error) {
      // 이미 위에서 Error 객체를 throw 했으므로 그대로 다시 throw 하거나, 추가 가공
      // throw err;
      // 만약 위에서 throw한 에러 외의 다른 에러(네트워크 등)를 잡고 싶다면 별도 처리
    }
    // 최종적으로 어떤 에러든 잡아서 throw, 혹은 UI에서 처리할 수 있는 형태로 반환
    throw new Error(
      `Failed to fetch journal detail for ID ${journalId}. Reason: ${err instanceof Error ? err.message : 'Unknown error'}`
    );
  }
};

/**
 * 모든 감정 데이터를 가져옵니다.
 */
export const fetchEmotions = async (): Promise<Emotion[]> => {
  try {
    const { data, error } = await supabase
      .from('emotions')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching emotions:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('An unexpected error occurred while fetching emotions:', err);
    return [];
  }
};

/**
 * 새로운 영성일기를 생성합니다.
 */
export const createJournal = async (journalData: {
  user_id: string;
  date: string;
  mode: 'free_writing' | 'prompt_based' | 'handwriting_upload';
  emotion_id: string;
  content?: string;
  answers?: Array<{ answer: string; order: number }>;
  shared_groups?: string[];
}): Promise<Journal> => {
  try {
    const { data, error } = await supabase
      .from('journals')
      .insert({
        user_id: journalData.user_id,
        date: journalData.date,
        mode: journalData.mode,
        emotion_id: journalData.emotion_id,
        shared_groups: journalData.shared_groups || [],
      })
      .select('*')
      .single();

    if (error) {
      console.error('Error creating journal:', error);
      throw error;
    }

    // 저널 엔트리 생성
    if (journalData.mode === 'free_writing' && journalData.content) {
      // 자유 글쓰기의 경우
      const { error: entryError } = await supabase.from('journal_entries').insert({
        journal_id: data.id,
        entry_type: 'general' as JournalEntryType,
        text_content: journalData.content,
        entry_order: 1,
      });

      if (entryError) {
        console.error('Error creating journal entry:', entryError);
        throw entryError;
      }
    } else if (journalData.mode === 'prompt_based' && journalData.answers) {
      // 질문 기반 글쓰기의 경우 - 각 답변을 별도 엔트리로 저장
      const entryInserts = journalData.answers.map((answer) => ({
        journal_id: data.id,
        entry_type: 'answer' as JournalEntryType,
        text_content: answer.answer,
        entry_order: answer.order,
      }));

      const { error: entryError } = await supabase.from('journal_entries').insert(entryInserts);

      if (entryError) {
        console.error('Error creating journal entries:', entryError);
        throw entryError;
      }
    }

    return data;
  } catch (err) {
    console.error('An unexpected error occurred while creating journal:', err);
    throw err;
  }
};

/**
 * 영성일기를 삭제합니다.
 * @param journalId 삭제할 영성일기의 ID
 * @param userId 현재 사용자 ID (권한 확인용)
 */
export const deleteJournal = async (journalId: string, userId: string): Promise<void> => {
  if (!journalId) {
    throw new Error('Journal ID is required.');
  }

  if (!userId) {
    throw new Error('User ID is required.');
  }

  try {
    // 먼저 해당 일기의 소유자인지 확인
    const { data: journal, error: fetchError } = await supabase
      .from('journals')
      .select('user_id')
      .eq('id', journalId)
      .single();

    if (fetchError) {
      console.error('Error fetching journal for deletion check:', fetchError);
      throw fetchError;
    }

    if (!journal) {
      throw new Error('Journal not found.');
    }

    if (journal.user_id !== userId) {
      throw new Error('You do not have permission to delete this journal.');
    }

    // 일기 삭제
    const { error: deleteError } = await supabase
      .from('journals')
      .delete()
      .eq('id', journalId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting journal:', deleteError);
      throw deleteError;
    }

    console.log(`Journal ${journalId} deleted successfully`);
  } catch (err) {
    console.error('An unexpected error occurred while deleting journal:', err);
    throw err;
  }
};
