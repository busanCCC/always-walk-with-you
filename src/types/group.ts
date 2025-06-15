export interface Group {
  id: string; // uuid
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  // 계산된 필드
  member_count?: number; // API에서 계산하거나 추가 쿼리로 가져올 수 있음
  is_admin?: boolean; // 현재 사용자가 관리자인지 여부 (그룹 멤버십 정보)
  has_new_content?: boolean; // 'N' 뱃지를 위한 필드 (별도 로직으로 계산 필요)
}

export interface GroupMembership {
  id: string; // uuid
  group_id: string;
  user_id: string;
  is_admin: boolean;
  joined_at?: string;
}

export interface CreateGroupPayload {
  name: string;
  description: string;
}

export interface UpdateGroupPayload {
  name: string;
  description: string;
}

// 그룹 멤버 정보와 사용자 정보를 함께 표시하기 위한 타입
export interface GroupMemberWithUser extends GroupMembership {
  users: {
    id: string;
    name?: string;
    email?: string;
    profile_img?: string;
  };
}

// API 응답 타입
export interface GroupWithMembershipDetails extends Group {
  membership?: GroupMembership;
}

export interface UserGroup {
  id: string;
  user_id: string;
  group_id: string;
  role: 'member' | 'leader' | 'admin';
  joined_at: string;
  group: Group;
}
