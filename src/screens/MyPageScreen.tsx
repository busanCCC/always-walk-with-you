import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, fontStyles } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useQuestionStore } from '@/store/questionStore';
import { supabase } from '@/utils/supabaseClient';
import { useNetwork } from '@/utils/networkManager';

import GroupModal from '@/components/common/GroupModal';
import CustomHeader from '@/components/common/CustomHeader';
import AlertModal from '@/components/common/AlertModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  profile_img: string | null;
}

const MyPageScreen = () => {
  const navigation = useNavigation();
  const { user: authUser, signOut } = useAuthStore();
  const { difficulty, setDifficulty } = useQuestionStore();
  const { isOnline } = useNetwork();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
  });

  // Modal states
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [difficultyModalVisible, setDifficultyModalVisible] = useState(false);
  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: '',
    message: '',
  });

  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          title="마이페이지"
          headerLeft={
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerButtonContainer}>
              <Ionicons name="chevron-back" size={24} color={colors['dark-grey-02']} />
            </TouchableOpacity>
          }
        />
      ),
    });
  }, [navigation]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (authUser?.id) {
        setLoading(true);

        // 오프라인이면 서버 호출 없이 기본 정보만 사용
        if (!isOnline) {
          console.log('🔄 오프라인 모드: 로컬 사용자 정보 사용');
          const localProfile: UserProfile = {
            id: authUser.id,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || '사용자',
            email: authUser.email || null,
            profile_img: authUser.user_metadata?.avatar_url || null,
          };

          setUserProfile(localProfile);
          setEditData({
            name: localProfile.name || '',
          });
          setLoading(false);
          return;
        }

        // 온라인이면 서버에서 최신 정보 가져오기
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching user profile:', error.message);
          }
          setUserProfile(data as UserProfile);

          // 수정 폼 초기화
          if (data) {
            setEditData({
              name: data.name || '',
            });
          }
        } catch (e) {
          console.error('Exception fetching user profile:', e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [authUser, isOnline]);

  const showAlert = (title: string, message: string) => {
    setAlertModal({ visible: true, title, message });
  };

  const hideAlert = () => {
    setAlertModal({ visible: false, title: '', message: '' });
  };

  const handleSignOut = async () => {
    setShowLogoutModal(true);
  };

  const handleDeleteAccount = async () => {
    setShowDeleteAccountModal(true);
  };

  const executeDeleteAccount = async () => {
    try {
      if (!authUser?.id) {
        showAlert('오류', '사용자 정보를 찾을 수 없습니다.');
        return;
      }

      // 1. 사용자 데이터 삭제 (Supabase에서 CASCADE로 관련 데이터도 함께 삭제됨)
      const { error: deleteError } = await supabase.from('users').delete().eq('id', authUser.id);

      if (deleteError) {
        console.error('사용자 데이터 삭제 오류:', deleteError);
        showAlert('오류', '회원 탈퇴 중 오류가 발생했습니다.');
        return;
      }

      // 2. 로그아웃 처리 (인증 계정은 서버에서 처리하거나 별도 관리)
      await signOut();

      showAlert('탈퇴 완료', '회원 탈퇴가 완료되었습니다.');
    } catch (error) {
      console.error('회원 탈퇴 오류:', error);
      showAlert('오류', '회원 탈퇴 중 예상치 못한 오류가 발생했습니다.');
    }
  };

  const handleEditProfile = () => {
    setEditModalVisible(true);
  };

  const handleDifficultySettings = () => {
    setDifficultyModalVisible(true);
  };

  const handleDifficultyChange = (newDifficulty: 'beginner' | 'normal') => {
    setDifficulty(newDifficulty);
    setDifficultyModalVisible(false);
  };

  const openLink = (url: string) => {
    Linking.openURL(url);
  };

  const handleUpdateProfile = async () => {
    if (!userProfile?.id) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editData.name.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userProfile.id);

      if (error) {
        throw error;
      }

      // 로컬 상태 업데이트
      setUserProfile((prev) =>
        prev
          ? {
              ...prev,
              name: editData.name.trim() || null,
            }
          : null
      );

      setEditModalVisible(false);
      showAlert('성공', '프로필이 성공적으로 업데이트되었습니다.');
    } catch (error) {
      console.error('Profile update error:', error);
      showAlert('오류', '프로필 업데이트 중 오류가 발생했습니다.');
    } finally {
      setUpdating(false);
    }
  };

  const displayName = userProfile?.name || authUser?.email?.split('@')[0] || '사용자';
  const email = userProfile?.email || authUser?.email || '이메일 정보 없음';

  const menuItems = [
    {
      id: 'edit-profile',
      title: '프로필 수정',
      icon: 'person-outline',
      onPress: handleEditProfile,
    },
    {
      id: 'difficulty-settings',
      title: '질문 유형 설정',
      icon: 'help-circle-outline',
      rightText: difficulty === 'beginner' ? '일상 질문' : '성찰 질문',
      onPress: handleDifficultySettings,
    },
    // {
    //   id: 'notifications',
    //   title: '알림 설정',
    //   icon: 'notifications-outline',
    //   onPress: () => showAlert('알림', '알림 설정 기능은 준비 중입니다.'),
    // },
    {
      id: 'privacy',
      title: '개인정보 처리방침',
      icon: 'shield-outline',
      onPress: () => openLink('https://always-walk-with-you.vercel.app/privacy'),
    },
    {
      id: 'terms',
      title: '서비스 이용약관',
      icon: 'document-text-outline',
      onPress: () => openLink('https://always-walk-with-you.vercel.app/terms'),
    },
    {
      id: 'support',
      title: '고객지원',
      icon: 'help-circle-outline',
      onPress: () => showAlert('고객지원', '고객지원 페이지로 이동합니다.'),
    },
    {
      id: 'version',
      title: '앱 버전',
      icon: 'information-circle-outline',
      rightText: '1.0.0',
      onPress: () => {},
    },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}>
          {/* 오프라인 상태 알림 */}
          {!isOnline && (
            <View style={styles.offlineNotice}>
              <Text style={styles.offlineNoticeText}>오프라인 모드 - 일부 기능이 제한됩니다</Text>
            </View>
          )}

          {/* 프로필 섹션 */}
          <View style={styles.profileSection}>
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
                </View>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileEmail}>{email}</Text>
              </View>
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <Ionicons name="create-outline" size={20} color={colors['grey-02']} />
              </TouchableOpacity>
            </View>

            {/* 프로필 상세 정보 */}
          </View>

          {/* 메뉴 섹션 */}
          <View style={styles.menuSection}>
            <Text style={styles.sectionTitle}>설정</Text>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  index === 0 && styles.firstMenuItem,
                  index === menuItems.length - 1 && styles.lastMenuItem,
                ]}
                onPress={item.onPress}
                disabled={item.id === 'version'}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons name={item.icon as any} size={18} color={colors['grey-02']} />
                  </View>
                  <Text style={styles.menuItemText}>{item.title}</Text>
                </View>
                <View style={styles.menuItemRight}>
                  {item.rightText && <Text style={styles.menuItemRightText}>{item.rightText}</Text>}
                  {item.id !== 'version' && (
                    <Ionicons name="chevron-forward" size={14} color={colors['grey-02']} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 로그아웃 버튼 */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={18} color={colors.destructive} />
            <Text style={styles.logoutButtonText}>로그아웃</Text>
          </TouchableOpacity>

          {/* 회원 탈퇴 버튼 */}
          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
            <Text style={styles.deleteAccountButtonText}>회원 탈퇴</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* 프로필 수정 모달 */}
        <GroupModal
          visible={editModalVisible}
          onClose={() => !updating && setEditModalVisible(false)}
          title="프로필 수정">
          <Text style={styles.inputLabel}>닉네임</Text>
          <TextInput
            style={styles.textInput}
            value={editData.name}
            onChangeText={(text) => setEditData({ ...editData, name: text })}
            placeholder="닉네임을 입력하세요"
            editable={!updating}
          />

          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setEditModalVisible(false)}
              disabled={updating}>
              <Text style={[styles.cancelButtonText, updating && styles.disabledButtonText]}>
                취소
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleUpdateProfile}
              disabled={updating}>
              {updating ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>저장</Text>
              )}
            </TouchableOpacity>
          </View>
        </GroupModal>

        {/* 로그아웃 확인 모달 */}
        <ConfirmationModal
          visible={showLogoutModal}
          onClose={() => setShowLogoutModal(false)}
          onConfirm={() => {
            setShowLogoutModal(false);
            signOut();
          }}
          title="로그아웃"
          message="정말 로그아웃하시겠습니까?"
          confirmText="로그아웃"
          cancelText="취소"
        />

        {/* 회원 탈퇴 확인 모달 */}
        <ConfirmationModal
          visible={showDeleteAccountModal}
          onClose={() => setShowDeleteAccountModal(false)}
          onConfirm={() => {
            setShowDeleteAccountModal(false);
            executeDeleteAccount();
          }}
          title="회원 탈퇴"
          message="정말로 회원 탈퇴하시겠습니까?&#10;&#10;탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다."
          confirmText="탈퇴"
          cancelText="취소"
        />

        {/* 일반 알림 모달 */}
        <AlertModal
          visible={alertModal.visible}
          title={alertModal.title}
          message={alertModal.message}
          onClose={hideAlert}
        />

        {/* 난이도 설정 모달 */}
        <GroupModal
          visible={difficultyModalVisible}
          onClose={() => setDifficultyModalVisible(false)}
          title="질문 유형 설정">
          <Text style={styles.difficultyDescription}>
            영성일기 작성 시 나오는 질문의 유형을 선택해주세요.
          </Text>

          <View style={styles.difficultyOptions}>
            <TouchableOpacity
              style={[
                styles.difficultyOption,
                difficulty === 'beginner' && styles.selectedDifficultyOption,
              ]}
              onPress={() => handleDifficultyChange('beginner')}>
              <View style={styles.difficultyInfo}>
                <Text
                  style={[
                    styles.difficultyTitle,
                    difficulty === 'beginner' && styles.selectedDifficultyText,
                  ]}>
                  일상 질문 (초심자 추천)
                </Text>
                <Text
                  style={[
                    styles.difficultySubtitle,
                    difficulty === 'beginner' && styles.selectedDifficultyText,
                  ]}>
                  가벼운 마음으로 하루를 정리해요
                </Text>
              </View>
              {difficulty === 'beginner' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary.DEFAULT} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.difficultyOption,
                difficulty === 'normal' && styles.selectedDifficultyOption,
              ]}
              onPress={() => handleDifficultyChange('normal')}>
              <View style={styles.difficultyInfo}>
                <Text
                  style={[
                    styles.difficultyTitle,
                    difficulty === 'normal' && styles.selectedDifficultyText,
                  ]}>
                  성찰 질문
                </Text>
                <Text
                  style={[
                    styles.difficultySubtitle,
                    difficulty === 'normal' && styles.selectedDifficultyText,
                  ]}>
                  내 마음을 깊이 들여다봐요
                </Text>
              </View>
              {difficulty === 'normal' && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary.DEFAULT} />
              )}
            </TouchableOpacity>
          </View>
        </GroupModal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  container: {
    flex: 1,
    padding: spacing[4],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...fontStyles['base-normal'],
    color: colors['grey-02'],
    marginTop: spacing[2],
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: spacing[6],
  },
  headerButtonContainer: {
    paddingHorizontal: spacing[2],
  },

  // 프로필 섹션
  profileSection: {
    borderRadius: spacing[3],
    borderWidth: 1,
    borderColor: colors['light-grey-02'],
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing[3],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    ...fontStyles['xl-tight'],
    color: colors.primary.DEFAULT,
    fontWeight: '600',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...fontStyles['lg-tight'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[0.5],
  },
  profileEmail: {
    ...fontStyles['sm-normal'],
    color: colors['grey-02'],
  },
  editButton: {
    padding: spacing[2],
  },
  profileDetails: {
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors['light-grey-02'],
    gap: spacing[2],
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  detailText: {
    ...fontStyles['sm-normal'],
    color: colors['grey-03'],
  },

  // 메뉴 섹션
  menuSection: {
    marginBottom: spacing[6],
    borderWidth: 1,
    borderColor: colors['light-grey-02'],
    borderRadius: spacing[3],
    paddingVertical: spacing[4],
  },
  sectionTitle: {
    ...fontStyles['sm-tight'],
    color: colors['grey-03'],
    marginBottom: spacing[3],
    marginLeft: spacing[1],
    paddingHorizontal: spacing[4],
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3.5],

    borderColor: colors['light-grey-02'],
    marginBottom: -1,
  },
  firstMenuItem: {
    borderTopLeftRadius: spacing[3],
    borderTopRightRadius: spacing[3],
  },
  lastMenuItem: {
    borderBottomLeftRadius: spacing[3],
    borderBottomRightRadius: spacing[3],
    marginBottom: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
  },
  menuItemText: {
    ...fontStyles['base-normal'],
    color: colors['dark-grey-01'],
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  menuItemRightText: {
    ...fontStyles['sm-normal'],
    color: colors['grey-02'],
  },

  // 로그아웃 버튼
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: spacing[3],
    paddingVertical: spacing[3.5],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors['light-grey-02'],
  },
  logoutButtonText: {
    ...fontStyles['base-normal'],
    color: colors.destructive,
  },

  // 회원 탈퇴 버튼
  deleteAccountButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    marginTop: spacing[3],
  },
  deleteAccountButtonText: {
    ...fontStyles['xs-normal'],
    color: colors['grey-02'],
    textDecorationLine: 'underline',
  },

  // 모달 스타일
  inputLabel: {
    ...fontStyles['sm-tight'],
    color: colors['grey-03'],
    marginBottom: spacing[1],
    marginTop: spacing[2],
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors['light-grey-02'],
    borderRadius: spacing[2],
    padding: spacing[3],
    ...fontStyles['base-normal'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[1],
    backgroundColor: colors.white,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing[4],
    gap: spacing[3],
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
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

  // 난이도 설정 모달 스타일
  difficultyDescription: {
    ...fontStyles['sm-normal'],
    color: colors['grey-03'],
    marginTop: spacing[2],
    marginBottom: spacing[4],
    lineHeight: 20,
  },
  difficultyOptions: {
    gap: spacing[3],
  },
  difficultyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors['light-grey-02'],
    borderRadius: spacing[2],
    backgroundColor: colors.white,
  },
  selectedDifficultyOption: {
    borderColor: colors.primary.DEFAULT,
    backgroundColor: colors.primary.light,
  },
  difficultyInfo: {
    flex: 1,
    paddingRight: spacing[2],
  },
  difficultyTitle: {
    ...fontStyles['base-tight'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[1],
  },
  difficultySubtitle: {
    ...fontStyles['sm-normal'],
    color: colors['grey-02'],
  },
  selectedDifficultyText: {
    color: colors.primary.DEFAULT,
  },

  // 오프라인 상태 알림 스타일
  offlineNotice: {
    backgroundColor: colors['light-grey-01'],
    padding: spacing[3],
    borderRadius: spacing[2],
    marginBottom: spacing[4],
    borderLeftWidth: 4,
    borderLeftColor: colors['grey-02'],
  },
  offlineNoticeText: {
    ...fontStyles['sm-tight'],
    color: colors['grey-03'],
    textAlign: 'center',
  },
});

export default MyPageScreen;
