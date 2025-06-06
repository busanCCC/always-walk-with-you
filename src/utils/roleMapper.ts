/**
 * 그룹 멤버 역할을 한글로 변환하는 매퍼
 */
export const getRoleDisplayName = (role: string | undefined, isAdmin?: boolean): string => {
  // is_admin이 true면 순장

  // role 기반 매핑
  switch (role?.toLowerCase()) {
    case 'leader':
      return '순장 ';
    case 'staff':
      return '간사 ';
    case 'member':
      return '순원 ';
    default:
      return '외부인 '; // 기본값
  }
};

/**
 * 사용자 이름과 역할을 조합한 표시명을 반환
 */
export const getUserDisplayName = (
  name?: string,
  email?: string,
  role?: string,
  isAdmin?: boolean
): string => {
  const userName = name || email || '알 수 없음';
  const roleDisplay = getRoleDisplayName(role, isAdmin);

  return `${userName} ${roleDisplay}`;
};

/**
 * 그룹 멤버십 정보를 기반으로 표시명 생성
 */
export const getMemberDisplayName = (member: {
  users: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  is_admin?: boolean;
}): string => {
  return getUserDisplayName(
    member.users.name || undefined,
    member.users.email || undefined,
    member.users.role || undefined,
    member.is_admin
  );
};
