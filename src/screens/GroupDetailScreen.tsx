import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
  Dimensions,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types/index';
import { colors, spacing, fontStyles } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  useGroupDetails,
  useUpdateGroup,
  useDeleteGroup,
  useGroupMembers,
} from '@/queries/groupQueries';
import { UpdateGroupPayload } from '@/types/group';
import GroupModal from '@/components/common/GroupModal';

type GroupDetailScreenRouteProp = RouteProp<RootStackParamList, 'GroupDetail'>;
const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.8; // 화면 너비의 80%

const GroupDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<GroupDetailScreenRouteProp>();
  const { groupId, groupName } = route.params;

  // 상태 관리
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
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
    data: members,
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useGroupMembers(drawerVisible ? groupId : undefined); // Drawer가 열려있을 때만 멤버 정보 요청

  const updateGroupMutation = useUpdateGroup();
  const deleteGroupMutation = useDeleteGroup();

  const isAdmin = groupDetails?.is_admin || false;

  // 페이지 진입 시 헤더 설정 - 즉시 전달받은 이름으로 설정하되, API 로드 후 업데이트
  useEffect(() => {
    navigation.setOptions({
      headerTitle: groupDetails?.name || groupName, // API 데이터 우선, 없으면 파라미터 사용
      headerTitleAlign: 'center', // 중앙 정렬
      headerRight: () => (
        <TouchableOpacity
          onPress={drawerVisible ? closeDrawer : openDrawer}
          style={styles.drawerButton}
          disabled={isLoading}>
          <Ionicons
            name={drawerVisible ? 'close' : 'menu'}
            size={spacing[6]}
            color={isLoading ? colors['grey-02'] : colors['grey-01']}
          />
        </TouchableOpacity>
      ),
    });
  }, [navigation, groupName, groupDetails, drawerVisible, isLoading]); // groupDetails 의존성 추가

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
        campus: groupDetails.campus,
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

  const handleEditSubmit = () => {
    if (!editGroupData.name.trim()) {
      Alert.alert('오류', '순 이름은 반드시 입력해야 합니다.');
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
          Alert.alert('오류', `순 정보 수정 중 오류가 발생했습니다: ${error.message}`);
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
        Alert.alert('오류', `순 삭제 중 오류가 발생했습니다: ${error.message}`);
      },
    });
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
    <View style={styles.container}>
      <Text style={styles.placeholderText}>여기에 해당 순의 글 목록이 표시됩니다.</Text>

      {/* Drawer 오버레이 */}
      <Modal
        visible={drawerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDrawer}>
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={styles.drawerBackdrop} activeOpacity={1} onPress={closeDrawer} />

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
                              {member.users.avatar_url ? (
                                <Text>A</Text> // TODO: 실제 아바타 이미지 사용
                              ) : (
                                <Text style={styles.memberInitial}>
                                  {(member.users.name || member.users.email || 'U')
                                    .charAt(0)
                                    .toUpperCase()}
                                </Text>
                              )}
                            </View>{' '}
                            <View style={styles.memberInfo}>
                              <Text style={styles.memberName}>
                                {member.users.name || member.users.email || '이름 없음'}
                                {member.is_admin && (
                                  <Text style={styles.adminBadge}> (관리자)</Text>
                                )}
                              </Text>
                            </View>
                          </View>
                        ))}
                    </>
                  )}
                </View>
              </View>

              {isAdmin && (
                <View style={styles.adminSection}>
                  <TouchableOpacity style={styles.drawerButton} onPress={showEditModal}>
                    <Ionicons name="create-outline" size={20} color={colors['dark-grey-01']} />
                    <Text style={styles.drawerButtonText}>순 정보 수정</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.drawerButton} onPress={showDeleteModal}>
                    <Ionicons name="trash-outline" size={20} color={colors.secondary.DEFAULT} />
                    <Text style={[styles.drawerButtonText, { color: colors.secondary.DEFAULT }]}>
                      순 삭제하기
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
        />

        <Text style={styles.inputLabel}>캠퍼스</Text>
        <TextInput
          style={styles.textInput}
          value={editGroupData.campus}
          onChangeText={(text) => setEditGroupData({ ...editGroupData, campus: text })}
          placeholder="캠퍼스 (선택사항)"
          editable={!updateGroupMutation.isPending}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
    backgroundColor: colors.white,
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
    padding: spacing[2],
    marginRight: spacing[2],
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
    borderBottomWidth: 1,
    borderBottomColor: colors['light-grey-01'],
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
  adminSection: {
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors['light-grey-02'],
  },
  drawerButtonText: {
    ...fontStyles['base-normal'],
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
    ...fontStyles['lg-tight'],
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
    ...fontStyles['lg-tight'],
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
    color: colors.secondary.DEFAULT,
    marginBottom: spacing[4],
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: colors.secondary.DEFAULT,
  },
  deleteButtonText: {
    ...fontStyles['base-tight'],
    color: colors.white,
  },
});

export default GroupDetailScreen;
