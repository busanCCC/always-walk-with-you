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
  UserGroup,
} from '@/types/group';
import { useAuthStore } from '@/store/authStore';

// 쿼리 키 상수
export const GROUP_KEYS = {
  all: ['groups'] as const,
  lists: () => [...GROUP_KEYS.all, 'list'] as const,
  list: (filters: string) => [...GROUP_KEYS.lists(), { filters }] as const,
  details: () => [...GROUP_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...GROUP_KEYS.details(), id] as const,
  members: (id: string) => [...GROUP_KEYS.detail(id), 'members'] as const,
  userGroups: (userId?: string) => [...GROUP_KEYS.all, 'userGroups', userId] as const,
};

/**
 * 내가 속한 모든 순 그룹 목록을 불러오는 훅
 */
export const useUserGroups = () => {
  const userId = useAuthStore((state) => state.session?.user?.id);

  return useQuery({
    queryKey: GROUP_KEYS.userGroups(userId),
    queryFn: async () => {
      if (!userId) {
        return [];
      }
      return fetchUserGroups(userId);
    },
    enabled: !!userId,
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
  const userId = useAuthStore((state) => state.session?.user?.id);

  return useMutation({
    mutationFn: (newGroup: CreateGroupPayload) => createGroup(newGroup),
    onSuccess: () => {
      // 기존 그룹 목록들 무효화
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.userGroups(userId) });

      // journalQueries의 useUserGroupsForSharing 쿼리도 무효화 (순 공유 리스트 업데이트를 위해)
      queryClient.invalidateQueries({ queryKey: ['userGroupsForSharing', userId] });
    },
  });
};

/**
 * 그룹 정보를 업데이트하는 훅
 */
export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.session?.user?.id);

  return useMutation({
    mutationFn: ({ groupId, groupData }: { groupId: string; groupData: UpdateGroupPayload }) =>
      updateGroup(groupId, groupData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.userGroups(userId) });

      queryClient.invalidateQueries({ queryKey: ['userGroupsForSharing', userId] });
    },
  });
};

/**
 * 그룹을 삭제하는 훅
 */
export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  const userId = useAuthStore((state) => state.session?.user?.id);

  return useMutation({
    mutationFn: (groupId: string) => deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.userGroups(userId) });

      // journalQueries의 useUserGroupsForSharing 쿼리도 무효화 (순 공유 리스트 업데이트를 위해)
      queryClient.invalidateQueries({ queryKey: ['userGroupsForSharing', userId] });
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

/**
 * 현재 사용자가 속한 그룹들을 가져오는 쿼리 훅 (순 공유용)
 */
export const useUserGroupsForSharing = () => {
  const userId = useAuthStore((state) => state.session?.user?.id);

  return useQuery<UserGroup[], Error>({
    queryKey: GROUP_KEYS.userGroups(userId),
    queryFn: async () => {
      if (!userId) {
        return [];
      }
      return fetchUserGroups(userId);
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5분 캐시
  });
};
