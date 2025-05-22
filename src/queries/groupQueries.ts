import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchUserGroups,
  createGroup,
  fetchGroupDetails,
  updateGroup,
  deleteGroup,
  fetchGroupMembers,
} from '@/apis/groupApi';
import {
  CreateGroupPayload,
  GroupWithMembershipDetails,
  UpdateGroupPayload,
  GroupMemberWithUser,
} from '@/types/group';

// 쿼리 키 상수
export const GROUP_KEYS = {
  all: ['groups'] as const,
  lists: () => [...GROUP_KEYS.all, 'list'] as const,
  list: (filters: string) => [...GROUP_KEYS.lists(), { filters }] as const,
  details: () => [...GROUP_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...GROUP_KEYS.details(), id] as const,
  members: (id: string) => [...GROUP_KEYS.detail(id), 'members'] as const,
};

/**
 * 내가 속한 모든 순 그룹 목록을 불러오는 훅
 */
export const useUserGroups = () => {
  return useQuery({
    queryKey: GROUP_KEYS.lists(),
    queryFn: fetchUserGroups,
  });
};

/**
 * 특정 그룹의 상세 정보를 불러오는 훅
 */
export const useGroupDetails = (groupId: string | undefined) => {
  return useQuery<
    GroupWithMembershipDetails,
    Error,
    GroupWithMembershipDetails,
    readonly [string, string | undefined]
  >({
    queryKey: ['groupDetails', groupId],
    queryFn: () => fetchGroupDetails(groupId!),
    enabled: !!groupId,
  });
};

/**
 * 새로운 순 그룹을 생성하는 훅
 */
export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (newGroup: CreateGroupPayload) => createGroup(newGroup),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.lists() });
    },
  });
};

/**
 * 그룹 정보를 업데이트하는 훅
 */
export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, groupData }: { groupId: string; groupData: UpdateGroupPayload }) =>
      updateGroup(groupId, groupData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.lists() });
    },
  });
};

/**
 * 그룹을 삭제하는 훅
 */
export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.lists() });
    },
  });
};

/**
 * 그룹 멤버 목록을 불러오는 훅
 */
export const useGroupMembers = (groupId: string | undefined) => {
  return useQuery<GroupMemberWithUser[], Error>({
    queryKey: groupId ? GROUP_KEYS.members(groupId) : ['groupMembers'],
    queryFn: () => fetchGroupMembers(groupId!),
    enabled: !!groupId,
  });
};
