/**
 * 지정된 날짜가 포함된 주의 일요일을 반환합니다.
 * @param date 기준 날짜
 * @returns 해당 주의 일요일 Date 객체
 */
export const getSunday = (date: Date): Date => {
  const newDate = new Date(date);
  const day = newDate.getDay(); // 0 (일요일) - 6 (토요일)
  const diff = newDate.getDate() - day;
  return new Date(newDate.setDate(diff));
};

/**
 * Date 객체를 'YYYY-MM-DD' 형식의 문자열로 변환합니다.
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 요일 배열을 반환합니다.
 * @returns 요일 배열
 */
export const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
