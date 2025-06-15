import questionsData from '@/assets/data/questions.json';

export type DifficultyLevel = 'beginner' | 'normal';

export interface Question {
  id: string;
  content: string;
  category: string;
  placeholder: string;
  order_index: number;
}

// JSON 데이터 타입 정의
interface QuestionsDataType {
  common: {
    q1: Question[];
    q4: Question;
  };
  beginner: {
    q2: Question[];
    q3: Question;
  };
  normal: {
    q2: Question[];
    q3: Question;
  };
}

// 타입 안전성을 위한 캐스팅
const typedQuestionsData = questionsData as unknown as QuestionsDataType;

/**
 * 날짜를 기준으로 1번 질문의 인덱스를 계산합니다
 * 매일 다른 질문이 나오도록 날짜를 기반으로 순환합니다
 */
export const getDailyQuestionIndex = (date: Date = new Date()): number => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // 연도, 월, 일을 조합하여 고유한 숫자 생성
  const dateNumber = year + month * 100 + day * 10000;

  // 44개 질문 중 하나를 선택 (0-43)
  return dateNumber % 44;
};

/**
 * 날짜를 기준으로 2번 질문의 인덱스를 계산합니다
 * 매일 다른 질문이 나오도록 날짜를 기반으로 순환합니다
 */
export const getDailyQuestion2Index = (date: Date = new Date()): number => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  // 2번 질문용으로 다른 계산 방식 사용
  const dateNumber = year * 3 + month * 50 + day * 7;

  // 10개 질문 중 하나를 선택 (0-9)
  return dateNumber % 10;
};

/**
 * 날짜에 따른 1번 질문을 가져옵니다 (공통)
 */
export const getDailyFirstQuestion = (date: Date = new Date()): Question => {
  const questionIndex = getDailyQuestionIndex(date);
  const questions = typedQuestionsData.common.q1;

  return questions[questionIndex];
};

/**
 * 난이도와 날짜에 따른 2번 질문을 가져옵니다
 */
export const getDailySecondQuestion = (
  difficulty: DifficultyLevel,
  date: Date = new Date()
): Question => {
  const questionIndex = getDailyQuestion2Index(date);
  const questions = typedQuestionsData[difficulty].q2;

  return questions[questionIndex];
};

/**
 * 모든 질문들을 가져옵니다 (1번은 공통으로 매일 변경, 2번은 난이도별로 매일 변경, 3번은 난이도별 고정, 4번은 공통 고정)
 */
export const getAllQuestions = (
  difficulty: DifficultyLevel,
  date: Date = new Date()
): Question[] => {
  const q1 = getDailyFirstQuestion(date);
  const q2 = getDailySecondQuestion(difficulty, date);
  const q3 = typedQuestionsData[difficulty].q3;
  const q4 = typedQuestionsData.common.q4;

  return [q1, q2, q3, q4];
};

/**
 * 특정 날짜의 1,2번 질문 미리보기 (디버깅용)
 */
export const previewDailyQuestions = (
  difficulty: DifficultyLevel,
  days: number = 7
): { date: string; q1: string; q2: string }[] => {
  const preview = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const q1 = getDailyFirstQuestion(date);
    const q2 = getDailySecondQuestion(difficulty, date);

    preview.push({
      date: date.toISOString().split('T')[0],
      q1: q1.content,
      q2: q2.content,
    });
  }

  return preview;
};
