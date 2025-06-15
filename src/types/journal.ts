import { Group } from './group';

export type JournalMode = 'free_writing' | 'prompt_based' | 'handwriting_upload';

// Question 인터페이스는 src/utils/questionUtils.ts로 이동되었습니다

export type JournalEntryType = 'general' | 'answer';

export interface JournalEntry {
  id: string;
  journal_id: string;
  entry_type: JournalEntryType;
  text_content?: string | null;
  entry_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface Journal {
  id: string; // uuid
  user_id: string; // uuid
  date: string; // date string (e.g., '2023-10-26')
  mode: JournalMode;
  emotion_id: string | null; // uuid
  shared_groups: Group[] | null; // uuid[] -> Group[]
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  emotion?: Emotion | null; // API join 또는 별도 조회 후 채워질 수 있음
  journal_entries?: JournalEntry[] | null; // 새로 추가
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
    profile_img?: string | null;
    is_admin?: boolean; // 그룹 관리자 여부
  } | null; // 작성자 정보 (그룹 일기 조회 시 포함)
}

export interface Emotion {
  id: string; // uuid
  name: string;
  img_url: string;
  description: string | null;
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}
