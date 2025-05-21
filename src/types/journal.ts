export type JournalMode = 'public' | 'private' | 'group';

export interface Journal {
  id: string; // uuid
  user_id: string; // uuid
  date: string; // date string (e.g., '2023-10-26')
  content: string | null;
  mode: JournalMode;
  emotion_id: string | null; // uuid
  shared_groups: string[] | null; // uuid[]
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
  emotion?: Emotion | null; // API join 또는 별도 조회 후 채워질 수 있음
}

export interface Emotion {
  id: string; // uuid
  name: string;
  img_url: string;
  description: string | null;
  created_at: string; // timestamp with time zone
  updated_at: string; // timestamp with time zone
}
