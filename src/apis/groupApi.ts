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

    console.log(`그룹 ID: ${groupId} 삭제 성공`);
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
