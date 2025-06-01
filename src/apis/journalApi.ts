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
          emotion: Array.isArray(j.emotions) ? j.emotions[0] || null : j.emotions || null,
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
      emotion: Array.isArray(rawData.emotions)
        ? rawData.emotions[0] || null
        : rawData.emotions || null,
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

    // unique constraint 위반 에러 체크
    if (err instanceof Error && err.message.includes('unique_user_date_journal')) {
      const constraintError = new Error('하루에 하나의 일기만 작성할 수 있습니다.');
      constraintError.name = 'UniqueConstraintError';
      throw constraintError;
    }

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

/**
 * 영성일기를 수정합니다.
 * @param journalId 수정할 영성일기의 ID
 * @param userId 현재 사용자 ID (권한 확인용)
 * @param updateData 수정할 데이터
 */
export const updateJournal = async (
  journalId: string,
  userId: string,
  updateData: {
    emotion_id?: string;
    content?: string;
    answers?: Array<{ answer: string; order: number }>;
    shared_groups?: string[];
  }
): Promise<Journal> => {
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
      .select('user_id, mode')
      .eq('id', journalId)
      .single();

    if (fetchError) {
      console.error('Error fetching journal for update check:', fetchError);
      throw fetchError;
    }

    if (!journal) {
      throw new Error('Journal not found.');
    }

    if (journal.user_id !== userId) {
      throw new Error('You do not have permission to update this journal.');
    }

    // 1. 일기 메타데이터 업데이트 (감정, 순 공유)
    if (updateData.emotion_id !== undefined || updateData.shared_groups !== undefined) {
      const updateFields: any = {
        updated_at: new Date().toISOString(),
      };

      if (updateData.emotion_id !== undefined) {
        updateFields.emotion_id = updateData.emotion_id;
      }

      if (updateData.shared_groups !== undefined) {
        updateFields.shared_groups = updateData.shared_groups;
      }

      const { error: updateError } = await supabase
        .from('journals')
        .update(updateFields)
        .eq('id', journalId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('Error updating journal metadata:', updateError);
        throw updateError;
      }
    }

    // 2. 일기 내용 업데이트
    if (journal.mode === 'free_writing' && updateData.content !== undefined) {
      // 자유 글쓰기의 경우 - 기존 엔트리 업데이트
      const { error: entryError } = await supabase
        .from('journal_entries')
        .update({
          text_content: updateData.content,
          updated_at: new Date().toISOString(),
        })
        .eq('journal_id', journalId)
        .eq('entry_type', 'general');

      if (entryError) {
        console.error('Error updating journal entry:', entryError);
        throw entryError;
      }
    } else if (journal.mode === 'prompt_based' && updateData.answers) {
      // 질문 기반 글쓰기의 경우 - 답변 엔트리들 업데이트
      for (const answer of updateData.answers) {
        const { error: entryError } = await supabase
          .from('journal_entries')
          .update({
            text_content: answer.answer,
            updated_at: new Date().toISOString(),
          })
          .eq('journal_id', journalId)
          .eq('entry_type', 'answer')
          .eq('entry_order', answer.order);

        if (entryError) {
          console.error('Error updating journal answer entry:', entryError);
          throw entryError;
        }
      }
    }

    // 3. 업데이트된 일기 데이터 반환
    const updatedJournal = await fetchJournalById(journalId);
    console.log(`Journal ${journalId} updated successfully`);
    return updatedJournal;
  } catch (err) {
    console.error('An unexpected error occurred while updating journal:', err);
    throw err;
  }
};

/**
 * 그룹에 공유된 일기들을 가져옵니다.
 * @param groupId 그룹 ID
 */
export const fetchGroupJournals = async (groupId: string): Promise<Journal[]> => {
  if (!groupId) {
    console.error('Group ID not provided, cannot fetch group journals');
    return [];
  }

  try {
    // 1. 그룹에 공유된 일기들을 가져오기
    const { data: journalsData, error: journalsError } = await supabase
      .from('journals')
      .select(
        `
        *,
        emotions (*),
        journal_entries (*),
        users (id, name, email, profile_img)
      `
      )
      .contains('shared_groups', [groupId])
      .order('created_at', { ascending: false });

    if (journalsError) {
      console.error('Error fetching group journals:', journalsError);
      throw journalsError;
    }

    if (!journalsData || journalsData.length === 0) {
      return [];
    }

    // 2. 작성자들의 user_id 목록 추출
    const userIds = [...new Set(journalsData.map((j) => j.user_id))];

    // 3. 각 작성자의 그룹 내 권한 정보 조회
    const { data: membershipData, error: membershipError } = await supabase
      .from('group_memberships')
      .select('user_id, is_admin')
      .eq('group_id', groupId)
      .in('user_id', userIds);

    if (membershipError) {
      console.error('Error fetching group memberships:', membershipError);
      throw membershipError;
    }

    // 4. 권한 정보를 Map으로 변환 (빠른 조회를 위해)
    const membershipMap = new Map(membershipData?.map((m) => [m.user_id, m.is_admin]) || []);

    // 5. 일기 데이터와 권한 정보 결합
    const rawData = journalsData as (RawJournalData & { users: any })[];

    const journalsWithDetails: Journal[] = rawData.map(
      (j): Journal => ({
        id: j.id,
        user_id: j.user_id,
        date: j.date,
        mode: j.mode,
        emotion_id: j.emotion_id,
        shared_groups: j.shared_groups,
        created_at: j.created_at,
        updated_at: j.updated_at,
        emotion: Array.isArray(j.emotions) ? j.emotions[0] || null : j.emotions || null,
        journal_entries: j.journal_entries || null,
        user: j.users
          ? {
              id: j.users.id,
              name: j.users.name,
              email: j.users.email,
              profile_img: j.users.profile_img,
              is_admin: membershipMap.get(j.user_id) || false,
            }
          : null,
      })
    );

    return journalsWithDetails;
  } catch (error) {
    console.error('Error in fetchGroupJournals:', error);
    throw error;
  }
};

/**
 * 특정 날짜에 사용자의 일기가 이미 존재하는지 확인합니다.
 * @param userId 사용자 ID
 * @param date 날짜 (YYYY-MM-DD)
 */
export const checkJournalExistsForDate = async (userId: string, date: string): Promise<boolean> => {
  if (!userId || !date) {
    console.error('User ID and date are required to check journal existence');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('journals')
      .select('id')
      .eq('user_id', userId)
      .eq('date', date)
      .limit(1);

    if (error) {
      console.error('Error checking journal existence:', error);
      throw error;
    }

    return data && data.length > 0;
  } catch (err) {
    console.error('An unexpected error occurred while checking journal existence:', err);
    return false;
  }
};
