import { Journal } from '@/types/journal';

/**
 * 특정 날짜에 일기가 있는지 확인하는 함수
 * @param journals 일기 목록
 * @param dateString YYYY-MM-DD 형식의 날짜 문자열
 * @returns 해당 날짜의 일기가 있으면 true, 없으면 false
 */
export const hasJournalForDate = (journals: Journal[], dateString: string): boolean => {
  return journals.some((journal) => journal.date === dateString);
};

/**
 * 특정 날짜의 일기를 찾는 함수
 * @param journals 일기 목록
 * @param dateString YYYY-MM-DD 형식의 날짜 문자열
 * @returns 해당 날짜의 일기, 없으면 null
 */
export const findJournalForDate = (journals: Journal[], dateString: string): Journal | null => {
  return journals.find((journal) => journal.date === dateString) || null;
};

/**
 * Date 객체를 YYYY-MM-DD 형식의 문자열로 변환 (현지 시간 기준)
 * @param date Date 객체
 * @returns YYYY-MM-DD 형식의 문자열
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 오늘 날짜를 YYYY-MM-DD 형식으로 반환 (현지 시간 기준)
 * @returns 오늘 날짜 문자열
 */
export const getTodayString = (): string => {
  return formatDateToString(new Date());
};
