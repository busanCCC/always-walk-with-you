import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Dimensions,
  Animated,
  FlatList,
  Share,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types/index';
import { colors, spacing, fontStyles } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useGroupDetails,
  useUpdateGroup,
  useDeleteGroup,
  useGroupMembers,
  useLeaveGroup,
  useRemoveMember,
} from '@/queries/groupQueries';
import { useGroupJournals } from '@/queries/journalQueries';
import { UpdateGroupPayload } from '@/types/group';
import { Journal } from '@/types/journal';
import GroupModal from '@/components/common/GroupModal';
import AlertModal from '@/components/common/AlertModal';
import GroupJournalCard from '@/components/journal/GroupJournalCard';
import { getMemberDisplayName } from '@/utils/roleMapper';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { createGroupInvite } from '@/apis/groupApi';
import { useAuthStore } from '@/store/authStore';
import CustomHeader from '@/components/common/CustomHeader';
import { SafeAreaView } from 'react-native-safe-area-context';

type GroupDetailScreenRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;
const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.8; // 화면 너비의 80%

const GroupDetailScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<GroupDetailScreenRouteProp>();
  const { groupId, groupName } = route.params;

  // 상태 관리
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [removeMemberModalVisible, setRemoveMemberModalVisible] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });
  const [editGroupData, setEditGroupData] = useState<UpdateGroupPayload>({
    name: '',
    description: '',
  });

  const drawerTranslateX = useRef(new Animated.Value(DRAWER_WIDTH)).current;

  // API 호출 훅
  const {
    data: groupDetails,
    isLoading,
    isError,
    error,
    refetch: refetchDetails,
  } = useGroupDetails(groupId);

  const {
    data: groupJournals,
    isLoading: journalsLoading,
    isError: journalsError,
    refetch: refetchJournals,
  } = useGroupJournals(groupId);

  const {
    data: members,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useGroupMembers(groupId); // 항상 멤버 정보 요청하도록 변경

  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();
  const leaveGroupMutation = useLeaveGroup();
  const removeMemberMutation = useRemoveMember();

  const isAdmin = groupDetails?.is_admin || false;
  const currentUserId = useAuthStore((state) => state.session?.user?.id);

  // 일기 카드 클릭 핸들러
  const handleJournalPress = (journal: Journal) => {
    navigation.navigate('JournalDetail', { journalId: journal.id });
  };

  // 일기 작성 버튼 핸들러
  const handleCreateJournal = () => {
    navigation.navigate('SelectJournalMode', {});
  };

  // 페이지 진입 시 헤더 설정 - drawerVisible 상태가 바뀔 때마다 헤더를 다시 그리도록 수정
  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          title={groupDetails?.name || groupName}
          headerLeft={
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerButtonContainer}>
              <Ionicons name="chevron-back" size={24} color={colors['dark-grey-02']} />
            </TouchableOpacity>
          }
          headerRight={
            <TouchableOpacity
              onPress={drawerVisible ? closeDrawer : openDrawer}
              disabled={isLoading}>
              <Ionicons
                name={drawerVisible ? 'close' : 'menu'}
                size={24}
                color={colors['dark-grey-02']}
              />
            </TouchableOpacity>
          }
          noBorder
        />
      ),
    });
  }, [navigation, groupDetails, groupName, drawerVisible, isLoading]);

  // Drawer 애니메이션 효과
  useEffect(() => {
    if (drawerVisible) {
      Animated.spring(drawerTranslateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    } else {
      Animated.spring(drawerTranslateX, {
        toValue: DRAWER_WIDTH,
        useNativeDriver: true,
        bounciness: 0,
      }).start();
    }
  }, [drawerVisible, drawerTranslateX]);

  // 그룹 정보가 로드되면 수정 폼 초기화
  useEffect(() => {
    if (groupDetails) {
      setEditGroupData({
        name: groupDetails.name,
        description: groupDetails.description || '',
      });
    }
  }, [groupDetails]);

  const openDrawer = () => setDrawerVisible(true);
  const closeDrawer = () => setDrawerVisible(false);

  const showEditModal = () => {
    setEditModalVisible(true);
    closeDrawer();
  };

  const showDeleteModal = () => {
    setDeleteModalVisible(true);
    closeDrawer();
  };

  const showInviteModal = () => {
    setInviteModalVisible(true);
    closeDrawer();
  };

  const showLeaveModal = () => {
    setLeaveModalVisible(true);
    closeDrawer();
  };

  const showAlert = (title: string, message: string) => {
    setAlertModal({ visible: true, title, message });
  };

  const hideAlert = () => {
    setAlertModal({ visible: false, title: '', message: '' });
  };

  const handleEditSubmit = () => {
    if (!editGroupData.name.trim()) {
      showAlert('오류', '순 이름은 반드시 입력해야 합니다.');
      return;
    }

    updateGroupMutation.mutate(
      {
        groupId,
        groupData: editGroupData,
      },
      {
        onSuccess: () => {
          setEditModalVisible(false);
          refetchDetails();
        },
        onError: (error) => {
          console.error('그룹 수정 오류:', error);
          showAlert('오류', `순 정보 수정 중 오류가 발생했습니다: ${error.message}`);
        },
      }
    );
  };

  const handleDeleteConfirm = () => {
    deleteGroupMutation.mutate(groupId, {
      onSuccess: () => {
        setDeleteModalVisible(false);
        setTimeout(() => {
          navigation.goBack();
        }, 500);
      },
      onError: (error) => {
        console.error('그룹 삭제 오류:', error);
        showAlert('오류', `순 삭제 중 오류가 발생했습니다: ${error.message}`);
      },
    });
  };

  const handleCreateInvite = async () => {
    setIsCreatingInvite(true);
    try {
      const invite = await createGroupInvite({
        group_id: groupId,
        expires_in_hours: 24,
      });

      // 초대 링크 생성
      const inviteUrl = `https://always-walk-with-you.vercel.app/invite/${groupId}/${invite.invite_token}`;

      // 공유 시트 열기
      const result = await Share.share({
        message: `'${groupDetails?.name || '순'}' 순에 초대합니다!\n\n${inviteUrl}`,
        url: inviteUrl,
        title: '순 초대',
      });

      if (result.action === Share.sharedAction) {
        showAlert('초대 완료', '초대 링크가 성공적으로 공유되었습니다.');
      }

      setInviteModalVisible(false);
    } catch (error) {
      console.error('초대 링크 생성 오류:', error);
      const errorMessage =
        error instanceof Error ? error.message : '초대 링크 생성에 실패했습니다.';
      showAlert('오류', errorMessage);
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleLeaveConfirm = () => {
    if (!groupId) return;

    leaveGroupMutation.mutate(groupId, {
      onSuccess: () => {
        setLeaveModalVisible(false);
        showAlert('순 나가기 완료', '순에서 성공적으로 나갔습니다.');
        // 약간의 지연 후 뒤로 가기
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
      },
      onError: (error) => {
        console.error('Leave group error:', error);
        showAlert('순 나가기 실패', error.message || '순 나가기 중 오류가 발생했습니다.');
      },
    });
  };

  const showRemoveMemberModal = (memberUserId: string, memberName: string) => {
    setMemberToRemove({ id: memberUserId, name: memberName });
    setRemoveMemberModalVisible(true);
  };

  const handleRemoveMemberConfirm = () => {
    if (!groupId || !memberToRemove) return;

    removeMemberMutation.mutate(
      { groupId, memberUserId: memberToRemove.id },
      {
        onSuccess: () => {
          setRemoveMemberModalVisible(false);
          setMemberToRemove(null);

          // 즉시 멤버 목록 새로고침
          refetchMembers();

          showAlert('멤버 삭제 완료', `${memberToRemove.name}님이 순에서 삭제되었습니다.`);
        },
        onError: (error) => {
          console.error('[handleRemoveMemberConfirm] 멤버 삭제 실패:', error);
          console.error('Error details:', JSON.stringify(error, null, 2));
          showAlert(
            '멤버 삭제 실패',
            `${error.message || '멤버 삭제 중 오류가 발생했습니다.'}\n\n자세한 내용은 콘솔을 확인해주세요.`
          );
        },
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (isError || !groupDetails) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>그룹 정보를 불러오는 데 실패했습니다.</Text>
        <Text style={styles.errorSubText}>{(error as Error)?.message || '다시 시도해주세요.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetchDetails()}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {journalsLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : journalsError ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>일기를 불러오는 데 실패했습니다.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetchJournals()}>
              <Text style={styles.retryButtonText}>다시 시도</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={groupJournals}
            keyExtractor={(item) => item.id}
            renderItem={({ item: journal }) => (
              <GroupJournalCard journal={journal} onPress={() => handleJournalPress(journal)} />
            )}
            ListEmptyComponent={() => (
              <View style={styles.centerContainer}>
                <Text style={styles.placeholderText}>
                  아직 공유된 영성일기가 없어요{'\n'}먼저 공유해볼까요?
                </Text>
              </View>
            )}
            contentContainerStyle={groupJournals?.length === 0 ? styles.centerContainer : undefined}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* 플로팅 액션 버튼 */}
        <TouchableOpacity style={styles.floatingButton} onPress={handleCreateJournal}>
          <MaterialIcons name="create" size={24} color={colors.primary.DEFAULT} />
        </TouchableOpacity>

        {/* Drawer 오버레이 */}
        <Modal
          visible={drawerVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closeDrawer}>
          <View style={styles.drawerOverlay}>
            <TouchableOpacity
              style={styles.drawerBackdrop}
              activeOpacity={1}
              onPress={closeDrawer}
            />

            <Animated.View
              style={[
                styles.drawer,
                {
                  transform: [{ translateX: drawerTranslateX }],
                },
              ]}>
              <ScrollView>
                <View style={styles.drawerHeader}>
                  <Text style={styles.drawerTitle}>{groupDetails.name}</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={closeDrawer}>
                    <Ionicons name="close" size={spacing[6]} color={colors['grey-01']} />
                  </TouchableOpacity>
                </View>

                <View style={styles.drawerContent}>
                  <Text style={styles.sectionTitle}>설명</Text>
                  <Text style={styles.description}>
                    {groupDetails.description || '설명이 없습니다.'}
                  </Text>

                  {/* 멤버 목록 섹션 */}
                  <View style={styles.memberSection}>
                    <Text style={styles.sectionTitle}>멤버 ({groupDetails.member_count || 0})</Text>

                    {membersLoading ? (
                      <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
                    ) : membersError ? (
                      <View style={styles.memberErrorContainer}>
                        <Text style={styles.memberErrorText}>멤버 정보를 불러올 수 없습니다.</Text>
                        <TouchableOpacity onPress={() => refetchMembers()}>
                          <Text style={styles.retryText}>다시 시도</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <>
                        {members &&
                          members.map((member) => (
                            <View key={member.id} style={styles.memberItem}>
                              <View style={styles.memberAvatar}>
                                {member.users.profile_img ? (
                                  <Text>A</Text>
                                ) : (
                                  <Text style={styles.memberInitial}>
                                    {(member.users.name || member.users.email || 'U')
                                      .charAt(0)
                                      .toUpperCase()}
                                  </Text>
                                )}
                              </View>
                              <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>
                                  {getMemberDisplayName(member)}
                                </Text>
                              </View>
                              {/* 관리자이고 자기 자신이 아닌 경우에만 삭제 버튼 표시 */}
                              {isAdmin && member.user_id !== currentUserId && (
                                <TouchableOpacity
                                  style={styles.removeMemberButton}
                                  onPress={() =>
                                    showRemoveMemberModal(
                                      member.user_id,
                                      member.users.name || member.users.email || '알 수 없는 사용자'
                                    )
                                  }>
                                  <Ionicons name="close" size={16} color={colors['grey-01']} />
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                      </>
                    )}
                  </View>
                </View>

                {isAdmin ? (
                  <View style={styles.buttonSection}>
                    <TouchableOpacity style={styles.drawerButton} onPress={showInviteModal}>
                      <Ionicons
                        name="person-add-outline"
                        size={20}
                        color={colors['dark-grey-01']}
                      />
                      <Text style={styles.drawerButtonText}>멤버 초대</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.drawerButton} onPress={showEditModal}>
                      <Ionicons name="create-outline" size={20} color={colors['dark-grey-01']} />
                      <Text style={styles.drawerButtonText}>순 정보 수정</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.drawerButton} onPress={showDeleteModal}>
                      <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                      <Text style={[styles.drawerButtonText, { color: colors.destructive }]}>
                        순 삭제하기
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.buttonSection}>
                    <TouchableOpacity style={styles.drawerButton} onPress={showLeaveModal}>
                      <Ionicons name="exit-outline" size={20} color={colors.destructive} />
                      <Text style={[styles.drawerButtonText, { color: colors.destructive }]}>
                        순 나가기
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>

        {/* 수정 모달 - GroupModal 컴포넌트 사용 */}
        <GroupModal
          visible={editModalVisible}
          onClose={() => !updateGroupMutation.isPending && setEditModalVisible(false)}
          title="순 정보 수정">
          <Text style={styles.inputLabel}>순 이름</Text>
          <TextInput
            style={styles.textInput}
            value={editGroupData.name}
            onChangeText={(text) => setEditGroupData({ ...editGroupData, name: text })}
            placeholder="순 이름"
            editable={!updateGroupMutation.isPending}
          />

          <Text style={styles.inputLabel}>설명</Text>
          <TextInput
            style={[styles.textInput, styles.textAreaInput]}
            value={editGroupData.description}
            onChangeText={(text) => setEditGroupData({ ...editGroupData, description: text })}
            placeholder="순에 대한 설명을 입력하세요"
            multiline
            numberOfLines={4}
            editable={!updateGroupMutation.isPending}
            returnKeyType="default"
            blurOnSubmit={false}
            enablesReturnKeyAutomatically={false}
          />

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setEditModalVisible(false)}
              disabled={updateGroupMutation.isPending}>
              <Text
                style={[
                  styles.cancelButtonText,
                  updateGroupMutation.isPending && styles.disabledButtonText,
                ]}>
                취소
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleEditSubmit}
              disabled={updateGroupMutation.isPending}>
              {updateGroupMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </GroupModal>

        {/* 삭제 확인 모달 - GroupModal 컴포넌트 사용 */}
        <GroupModal
          visible={deleteModalVisible}
          onClose={() => !deleteGroupMutation.isPending && setDeleteModalVisible(false)}
          title="순 삭제하기">
          <Text style={styles.deleteModalText}>'{groupDetails?.name}' 순을 삭제하시겠습니까?</Text>
          <Text style={styles.deleteWarningText}>
            이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.
          </Text>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setDeleteModalVisible(false)}
              disabled={deleteGroupMutation.isPending}>
              <Text
                style={[
                  styles.cancelButtonText,
                  deleteGroupMutation.isPending && styles.disabledButtonText,
                ]}>
                취소
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={handleDeleteConfirm}
              disabled={deleteGroupMutation.isPending}>
              {deleteGroupMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.deleteButtonText}>삭제</Text>
              )}
            </TouchableOpacity>
          </View>
        </GroupModal>

        {/* 초대 모달 - GroupModal 컴포넌트 사용 */}
        <GroupModal
          visible={inviteModalVisible}
          onClose={() => !isCreatingInvite && setInviteModalVisible(false)}
          title="멤버 초대하기">
          <Text style={styles.inviteDescriptionText}>
            초대 링크를 생성하여 새로운 순원을 초대할 수 있습니다.
          </Text>
          <Text style={styles.inviteWarningText}>
            • 초대 링크는 24시간 후 자동으로 만료됩니다{'\n'}• 링크를 받은 사람은 자동으로 순에
            가입됩니다{'\n'}• 링크 생성 후 바로 공유 창이 열립니다
          </Text>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setInviteModalVisible(false)}
              disabled={isCreatingInvite}>
              <Text
                style={[styles.cancelButtonText, isCreatingInvite && styles.disabledButtonText]}>
                취소
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleCreateInvite}
              disabled={isCreatingInvite}>
              {isCreatingInvite ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>초대 링크 생성</Text>
              )}
            </TouchableOpacity>
          </View>
        </GroupModal>

        {/* 순 나가기 모달 - GroupModal 컴포넌트 사용 */}
        <GroupModal
          visible={leaveModalVisible}
          onClose={() => !leaveGroupMutation.isPending && setLeaveModalVisible(false)}
          title="순 나가기">
          <Text style={styles.leaveModalText}>'{groupDetails?.name}' 순을 나가시겠습니까?</Text>
          <Text style={styles.leaveWarningText}>
            순을 나가면 해당 순의 영성일기에 접근할 수 없게 됩니다.{'\n'}
            다시 참여하려면 새로운 초대 링크가 필요합니다.
          </Text>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setLeaveModalVisible(false)}
              disabled={leaveGroupMutation.isPending}>
              <Text
                style={[
                  styles.cancelButtonText,
                  leaveGroupMutation.isPending && styles.disabledButtonText,
                ]}>
                취소
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.leaveButton]}
              onPress={handleLeaveConfirm}
              disabled={leaveGroupMutation.isPending}>
              {leaveGroupMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.leaveButtonText}>나가기</Text>
              )}
            </TouchableOpacity>
          </View>
        </GroupModal>

        {/* 멤버 삭제 확인 모달 - GroupModal 컴포넌트 사용 */}
        <GroupModal
          visible={removeMemberModalVisible}
          onClose={() => !removeMemberMutation.isPending && setRemoveMemberModalVisible(false)}
          title="멤버 삭제">
          <Text style={styles.deleteModalText}>
            '{memberToRemove?.name}' 님을 순에서 삭제하시겠습니까?
          </Text>
          <Text style={styles.deleteWarningText}>
            삭제된 멤버의 일기는 해당 순에서 더 이상 보이지 않으며,{'\n'}
            다시 참여하려면 새로운 초대 링크가 필요합니다.
          </Text>

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setRemoveMemberModalVisible(false)}
              disabled={removeMemberMutation.isPending}>
              <Text
                style={[
                  styles.cancelButtonText,
                  removeMemberMutation.isPending && styles.disabledButtonText,
                ]}>
                취소
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.deleteButton]}
              onPress={handleRemoveMemberConfirm}
              disabled={removeMemberMutation.isPending}>
              {removeMemberMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.deleteButtonText}>삭제</Text>
              )}
            </TouchableOpacity>
          </View>
        </GroupModal>

        {/* Alert Modal */}
        <AlertModal
          visible={alertModal.visible}
          title={alertModal.title}
          message={alertModal.message}
          onClose={hideAlert}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white, // 전체 배경색
  },
  container: {
    flex: 1,
    padding: spacing[4],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing[4],
  },
  errorText: {
    ...fontStyles['lg-tight'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[1],
  },
  errorSubText: {
    ...fontStyles['base-normal'],
    color: colors['grey-02'],
    textAlign: 'center',
    marginBottom: spacing[4],
  },
  retryButton: {
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[2.5],
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 8,
  },
  retryButtonText: {
    ...fontStyles['sm-tight'],
    color: colors.white,
  },
  placeholderText: {
    ...fontStyles['base-normal'],
    color: colors['grey-02'],
    textAlign: 'center',
    marginTop: spacing[8],
  },
  drawerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    // padding: spacing[2],
    // marginRight: spacing[2],
  },

  // Drawer 스타일
  drawerOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    width: DRAWER_WIDTH,
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.white,
    elevation: 5,
    shadowColor: colors.black,
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderTopLeftRadius: spacing[2],
    borderBottomLeftRadius: spacing[2],
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors['light-grey-02'],
  },
  drawerTitle: {
    ...fontStyles['lg-tight'],
    color: colors['dark-grey-01'],
    flex: 1,
  },
  closeButton: {
    padding: spacing[1],
  },
  drawerContent: {
    padding: spacing[4],
  },
  sectionTitle: {
    ...fontStyles['base-tight'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[2],
    marginTop: spacing[2],
  },
  description: {
    ...fontStyles['base-normal'],
    color: colors['grey-03'],
    marginBottom: spacing[4],
  },
  memberSection: {
    marginTop: spacing[2],
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[2],
  },
  memberInitial: {
    ...fontStyles['base-tight'],
    color: colors.primary.DEFAULT,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...fontStyles['base-normal'],
    color: colors['dark-grey-01'],
  },
  adminBadge: {
    ...fontStyles['sm-normal'],
    color: colors.primary.DEFAULT,
  },
  memberErrorContainer: {
    alignItems: 'center',
    paddingVertical: spacing[4],
  },
  memberErrorText: {
    ...fontStyles['sm-normal'],
    color: colors['grey-02'],
    marginBottom: spacing[2],
  },
  retryText: {
    ...fontStyles['sm-normal'],
    color: colors.primary.DEFAULT,
    textDecorationLine: 'underline',
  },
  buttonSection: {
    padding: spacing[4],
    gap: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors['light-grey-02'],
  },
  drawerButtonText: {
    ...fontStyles['sm-normal'],
    color: colors['dark-grey-01'],
    marginLeft: spacing[2],
  },

  // 수정 모달 스타일
  centeredModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalContent: {
    width: width * 0.9,
    backgroundColor: colors.white,
    borderRadius: spacing[3],
    padding: spacing[4],
    maxHeight: '80%',
  },
  editModalTitle: {
    ...fontStyles['xl-tight'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  inputLabel: {
    ...fontStyles['sm-tight'],
    color: colors['grey-03'],
    marginBottom: spacing[1],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors['light-grey-02'],
    borderRadius: spacing[1],
    padding: spacing[2],
    ...fontStyles['base-normal'],
    marginBottom: spacing[3],
  },
  textAreaInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[3],
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing[2.5],
    borderRadius: spacing[1],
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing[1],
  },
  cancelButton: {
    backgroundColor: colors['light-grey-01'],
  },
  cancelButtonText: {
    ...fontStyles['base-tight'],
    color: colors['grey-03'],
  },
  disabledButtonText: {
    opacity: 0.5,
  },
  saveButton: {
    backgroundColor: colors.primary.DEFAULT,
  },
  saveButtonText: {
    ...fontStyles['base-tight'],
    color: colors.white,
  },

  // 삭제 모달 스타일
  deleteModalContent: {
    width: width * 0.9,
    backgroundColor: colors.white,
    borderRadius: spacing[3],
    padding: spacing[4],
  },
  deleteModalTitle: {
    ...fontStyles['xl-tight'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  deleteModalText: {
    ...fontStyles['base-normal'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  deleteWarningText: {
    ...fontStyles['sm-normal'],
    color: colors.danger.DEFAULT,
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: colors.danger.DEFAULT,
  },
  deleteButtonText: {
    ...fontStyles['base-tight'],
    color: colors.white,
  },

  // 플로팅 액션 버튼 스타일
  floatingButton: {
    position: 'absolute',
    bottom: spacing[4],
    right: spacing[4],
    backgroundColor: colors.primary.light,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonContainer: {
    paddingHorizontal: spacing[2],
  },
  inviteDescriptionText: {
    ...fontStyles['base-normal'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[2],
  },
  inviteWarningText: {
    ...fontStyles['sm-normal'],
    color: colors['grey-02'],
    marginBottom: spacing[4],
  },
  leaveModalText: {
    ...fontStyles['base-normal'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[2],
  },
  leaveWarningText: {
    ...fontStyles['sm-normal'],
    color: colors['grey-02'],
    marginBottom: spacing[4],
  },
  leaveButton: {
    backgroundColor: colors.danger.DEFAULT,
  },
  leaveButtonText: {
    ...fontStyles['base-tight'],
    color: colors.white,
  },
  removeMemberButton: {
    padding: spacing[1],
  },
  drawerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: DRAWER_WIDTH,
    backgroundColor: colors['light-grey-02'],
    zIndex: 100,
    // 그림자 효과 등 추가 가능
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 10,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 50,
  },
});

export default GroupDetailScreen;
