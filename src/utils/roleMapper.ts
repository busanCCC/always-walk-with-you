/**
 * 사용자 표시명을 반환 (이름만)
 */
export const getUserDisplayName = (name?: string, email?: string, isAdmin?: boolean): string => {
  return name || email || '알 수 없음';
};

/**
 * 그룹 멤버십 정보를 기반으로 표시명 생성 (이름만)
 */
export const getMemberDisplayName = (member: {
  users: {
    name?: string | null;
    email?: string | null;
  };
  is_admin?: boolean;
}): string => {
  return getUserDisplayName(
    member.users.name || undefined,
    member.users.email || undefined,
    member.is_admin
  );
};
