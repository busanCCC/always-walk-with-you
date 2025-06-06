import { supabase } from '@/utils/supabaseClient';
import {
  Group,
  CreateGroupPayload,
  GroupMembership,
  GroupWithMembershipDetails,
  UpdateGroupPayload,
  GroupMemberWithUser,
  UserGroup,
} from '@/types/group';

// 그룹 초대 관련 타입
export interface GroupInvite {
  id: string;
  group_id: string;
  invite_token: string;
  created_at: string;
  expires_at: string;
  created_by: string;
  is_active: boolean;
  groups?: {
    id: string;
    name: string;
    description: string;
    campus?: string;
  };
}

export interface CreateInvitePayload {
  group_id: string;
  expires_in_hours?: number; // 기본값: 24시간
}

export interface InviteJoinResult {
  success: boolean;
  group: Group;
  membership: GroupMembership;
}

/**
 * 현재 사용자가 속한 모든 그룹을 가져옵니다.
 */
export const fetchUserGroups = async (userId: string): Promise<UserGroup[]> => {
  try {
    const { data, error } = await supabase
      .from('group_memberships')
      .select(
        `
        id,
        user_id,
        group_id,
        is_admin,
        joined_at,
        groups (
          id,
          name,
          description,
          created_at,
          updated_at
        )
      `
      )
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching user groups:', error);
      throw error;
    }

    // Supabase에서 반환된 데이터를 UserGroup 타입에 맞게 변환
    const userGroups: UserGroup[] = (data || []).map((item: any) => ({
      id: item.id,
      user_id: item.user_id,
      group_id: item.group_id,
      role: item.is_admin ? 'admin' : 'member',
      joined_at: item.joined_at,
      group: item.groups,
    }));

    return userGroups;
  } catch (err) {
    console.error('An unexpected error occurred while fetching user groups:', err);
    return [];
  }
};

export const createGroup = async (groupData: CreateGroupPayload) => {
  const { error: groupError } = await supabase.from('groups').insert({
    name: groupData.name,
    campus: groupData.campus,
    description: groupData.description,
  });
  if (groupError) {
    console.error('그룹 생성 오류:', groupError);
    throw groupError || new Error('그룹 생성 실패');
  }
};

export const fetchGroupDetails = async (groupId: string): Promise<GroupWithMembershipDetails> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('인증된 사용자가 없습니다.');
  }

  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (groupError || !group) {
    console.error('그룹 조회 오류:', groupError);
    throw groupError || new Error('그룹을 찾을 수 없습니다.');
  }

  const { data: membership, error: membershipError } = await supabase
    .from('group_memberships')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userData.user.id)
    .single();

  if (membershipError || !membership) {
    throw new Error('이 그룹에 대한 접근 권한이 없습니다.');
  }

  const { count, error: countError } = await supabase
    .from('group_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);

  if (countError) {
    console.error('멤버 수 조회 오류:', countError);
  }

  return {
    ...group,
    member_count: count || 0,
    is_admin: membership.is_admin,
    has_new_content: false,
    membership: membership as GroupMembership,
  };
};

/**
 * 순 그룹 정보를 수정합니다. 관리자 권한 필요
 */
export const updateGroup = async (
  groupId: string,
  groupData: UpdateGroupPayload
): Promise<GroupWithMembershipDetails> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('인증된 사용자가 없습니다.');
  }

  // 관리자 권한 체크
  const { data: membership, error: membershipError } = await supabase
    .from('group_memberships')
    .select('is_admin')
    .eq('group_id', groupId)
    .eq('user_id', userData.user.id)
    .single();

  if (membershipError || !membership || !membership.is_admin) {
    throw new Error('이 그룹을 수정할 권한이 없습니다.');
  }

  // 그룹 정보 업데이트
  const updatePayload = {
    name: groupData.name,
    description: groupData.description,
    ...(groupData.campus && { campus: groupData.campus }),
    updated_at: new Date().toISOString(),
  };

  // 업데이트 실행
  const { error: updateError } = await supabase
    .from('groups')
    .update(updatePayload)
    .eq('id', groupId);

  if (updateError) {
    console.error('그룹 업데이트 오류:', updateError);
    throw updateError;
  }

  // 업데이트된 그룹을 별도 쿼리로 가져오기
  const { data: updatedGroup, error: fetchError } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .single();

  if (fetchError || !updatedGroup) {
    console.error('업데이트 후 그룹 조회 오류:', fetchError);
    throw fetchError || new Error('업데이트된 그룹을 찾을 수 없습니다.');
  }

  // 업데이트된 그룹 상세 정보 반환
  return fetchGroupDetails(groupId);
};

/**
 * 순 그룹을 삭제합니다. 관리자 권한 필요
 */
export const deleteGroup = async (groupId: string): Promise<void> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('인증된 사용자가 없습니다.');
  }

  // 관리자 권한 체크
  const { data: membership, error: membershipError } = await supabase
    .from('group_memberships')
    .select('is_admin')
    .eq('group_id', groupId)
    .eq('user_id', userData.user.id)
    .single();

  if (membershipError || !membership || !membership.is_admin) {
    throw new Error('이 그룹을 삭제할 권한이 없습니다.');
  }

  try {
    const { error: groupDeleteError } = await supabase.from('groups').delete().eq('id', groupId);

    if (groupDeleteError) {
      console.error('그룹 삭제 오류:', groupDeleteError);
      throw groupDeleteError;
    }
  } catch (error) {
    console.error('그룹 삭제 중 오류 발생:', error);
    throw error;
  }
};

/**
 * 순 그룹의 멤버 목록을 가져옵니다.
 */
export const fetchGroupMembers = async (groupId: string): Promise<GroupMemberWithUser[]> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('인증된 사용자가 없습니다.');
  }

  // 사용자가 그룹 멤버인지 확인
  const { data: membership, error: membershipError } = await supabase
    .from('group_memberships')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userData.user.id)
    .single();

  if (membershipError || !membership) {
    throw new Error('이 그룹의 멤버 목록을 조회할 권한이 없습니다.');
  }

  // 모든 멤버 조회
  const { data: members, error: membersError } = await supabase
    .from('group_memberships')
    .select('*, users:user_id(*)')
    .eq('group_id', groupId)
    .order('is_admin', { ascending: false })
    .order('joined_at', { ascending: true });

  if (membersError) {
    console.error('그룹 멤버 조회 오류:', membersError);
    throw membersError;
  }

  return (members || []) as unknown as GroupMemberWithUser[];
};

/**
 * 그룹 초대 링크를 생성합니다. 관리자 권한 필요
 */
export const createGroupInvite = async (payload: CreateInvitePayload): Promise<GroupInvite> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('인증된 사용자가 없습니다.');
  }

  // 관리자 권한 체크
  const { data: membership, error: membershipError } = await supabase
    .from('group_memberships')
    .select('is_admin')
    .eq('group_id', payload.group_id)
    .eq('user_id', userData.user.id)
    .single();

  if (membershipError || !membership || !membership.is_admin) {
    throw new Error('초대 링크를 생성할 권한이 없습니다.');
  }

  // 32자리 랜덤 토큰 생성
  const token = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(
    ''
  );

  // 만료 시간 계산 (기본 24시간)
  const expiresInHours = payload.expires_in_hours || 24;
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const { data: invite, error: createError } = await supabase
    .from('group_invites')
    .insert({
      group_id: payload.group_id,
      invite_token: token,
      expires_at: expiresAt.toISOString(),
      created_by: userData.user.id,
      is_active: true,
    })
    .select('*')
    .single();

  if (createError) {
    console.error('초대 링크 생성 오류:', createError);
    throw createError;
  }

  return invite as GroupInvite;
};

/**
 * 초대 토큰으로 그룹 정보를 조회합니다.
 */
export const getGroupByInviteToken = async (token: string): Promise<GroupInvite | null> => {
  try {
    // RPC 호출 제거 - 문제가 될 수 있음
    // await supabase.rpc('cleanup_expired_invites');

    // 1단계: 초대 정보만 먼저 조회
    const { data: inviteData, error: inviteError } = await supabase
      .from('group_invites')
      .select('*')
      .eq('invite_token', token)
      .eq('is_active', true)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !inviteData) {
      console.error('[getGroupByInviteToken] 초대 정보 조회 실패');
      return null;
    }

    // 2단계: 그룹 정보 별도 조회
    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('id, name, description, campus')
      .eq('id', inviteData.group_id)
      .single();

    if (groupError || !groupData) {
      console.error('[getGroupByInviteToken] 그룹 정보 조회 실패');
      return null;
    }

    // 3단계: 결과 조합
    const result: GroupInvite = {
      ...inviteData,
      groups: groupData,
    };

    return result;
  } catch (err) {
    console.error('[getGroupByInviteToken] 예외 발생:', err);
    return null;
  }
};

/**
 * 그룹 초대 링크를 통해 그룹에 가입합니다.
 */
export const joinGroupByInvite = async (token: string): Promise<InviteJoinResult> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('인증된 사용자가 없습니다.');
  }

  // 초대 정보 확인
  const invite = await getGroupByInviteToken(token);
  if (!invite || !invite.groups) {
    throw new Error('유효하지 않거나 만료된 초대 링크입니다.');
  }

  // 이미 그룹 멤버인지 확인
  const { data: existingMembership, error: membershipCheckError } = await supabase
    .from('group_memberships')
    .select('id')
    .eq('group_id', invite.group_id)
    .eq('user_id', userData.user.id)
    .single();

  if (existingMembership) {
    throw new Error('이미 이 그룹의 멤버입니다.');
  }

  // 그룹에 가입
  const { data: membership, error: joinError } = await supabase
    .from('group_memberships')
    .insert({
      group_id: invite.group_id,
      user_id: userData.user.id,
      is_admin: false,
    })
    .select('*')
    .single();

  if (joinError) {
    console.error('그룹 가입 오류:', joinError);
    throw joinError;
  }

  return {
    success: true,
    group: invite.groups as Group,
    membership: membership as GroupMembership,
  };
};

/**
 * 그룹의 초대 링크 목록을 조회합니다. 관리자 권한 필요
 */
export const getGroupInvites = async (groupId: string): Promise<GroupInvite[]> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('인증된 사용자가 없습니다.');
  }

  // 관리자 권한 체크
  const { data: membership, error: membershipError } = await supabase
    .from('group_memberships')
    .select('is_admin')
    .eq('group_id', groupId)
    .eq('user_id', userData.user.id)
    .single();

  if (membershipError || !membership || !membership.is_admin) {
    throw new Error('초대 링크를 조회할 권한이 없습니다.');
  }

  // RPC 호출 제거 - 문제가 될 수 있음
  // await supabase.rpc('cleanup_expired_invites');

  const { data: invites, error } = await supabase
    .from('group_invites')
    .select('*')
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('초대 링크 조회 오류:', error);
    throw error;
  }

  return invites as GroupInvite[];
};

/**
 * 초대 링크를 비활성화합니다. 관리자 권한 필요
 */
export const deactivateGroupInvite = async (inviteId: string): Promise<void> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('인증된 사용자가 없습니다.');
  }

  // 초대 정보와 권한 확인
  const { data: invite, error: inviteError } = await supabase
    .from('group_invites')
    .select(
      `
      *,
      groups!inner (
        group_memberships!inner (
          user_id,
          is_admin
        )
      )
    `
    )
    .eq('id', inviteId)
    .eq('groups.group_memberships.user_id', userData.user.id)
    .eq('groups.group_memberships.is_admin', true)
    .single();

  if (inviteError || !invite) {
    throw new Error('초대 링크를 비활성화할 권한이 없습니다.');
  }

  const { error: updateError } = await supabase
    .from('group_invites')
    .update({ is_active: false })
    .eq('id', inviteId);

  if (updateError) {
    console.error('초대 링크 비활성화 오류:', updateError);
    throw updateError;
  }
};

/**
 * 순 나가기 - 사용자가 그룹에서 탈퇴합니다.
 */
export const leaveGroup = async (groupId: string): Promise<void> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('인증된 사용자가 없습니다.');
  }

  console.log('[leaveGroup] Database Function 호출:', { groupId, userId: userData.user.id });

  // Database Function 호출
  const { data, error } = await supabase.rpc('leave_group_and_update_journals', {
    p_group_id: groupId,
    p_user_id: userData.user.id,
  });

  console.log('[leaveGroup] Database Function 결과:', { data, error });

  if (error) {
    console.error('Database Function 실행 오류:', error);
    throw new Error(`순 나가기 중 오류가 발생했습니다: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error);
  }

  console.log(
    '[leaveGroup] 성공:',
    data.message,
    `(${data.updated_journals_count}개 일기 업데이트)`
  );
};

/**
 * 순에서 멤버를 삭제합니다. 관리자 권한 필요
 */
export const removeMemberFromGroup = async (
  groupId: string,
  memberUserId: string
): Promise<void> => {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    throw new Error('인증된 사용자가 없습니다.');
  }

  console.log('[removeMemberFromGroup] Database Function 호출:', {
    groupId,
    memberUserId,
    adminUserId: userData.user.id,
  });

  // Database Function 호출
  const { data, error } = await supabase.rpc('remove_member_and_update_journals', {
    p_group_id: groupId,
    p_member_user_id: memberUserId,
    p_admin_user_id: userData.user.id,
  });

  console.log('[removeMemberFromGroup] Database Function 결과:', { data, error });

  if (error) {
    console.error('Database Function 실행 오류:', error);
    throw new Error(`멤버 삭제 중 오류가 발생했습니다: ${error.message}`);
  }

  if (!data.success) {
    throw new Error(data.error);
  }

  console.log(
    '[removeMemberFromGroup] 성공:',
    data.message,
    `(${data.updated_journals_count}개 일기 업데이트)`
  );
};
