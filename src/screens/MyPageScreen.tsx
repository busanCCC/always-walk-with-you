import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, fontStyles } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/utils/supabaseClient';
import { getRoleDisplayName } from '@/utils/roleMapper';
import GroupModal from '@/components/common/GroupModal';
import CustomHeader from '@/components/common/CustomHeader';

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  campus: string | null;
  student_id: string | null;
  role: string | null;
  profile_img: string | null;
}

const MyPageScreen = () => {
  const navigation = useNavigation();
  const { user: authUser, signOut } = useAuthStore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    campus: '',
    student_id: '',
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
              campus: data.campus || '',
              student_id: data.student_id || '',
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
  }, [authUser]);

  const handleSignOut = async () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleEditProfile = () => {
    setEditModalVisible(true);
  };

  const handleUpdateProfile = async () => {
    if (!userProfile?.id) return;

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          name: editData.name.trim() || null,
          campus: editData.campus.trim() || null,
          student_id: editData.student_id.trim() || null,
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
              campus: editData.campus.trim() || null,
              student_id: editData.student_id.trim() || null,
            }
          : null
      );

      setEditModalVisible(false);
      Alert.alert('성공', '프로필이 성공적으로 업데이트되었습니다.');
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('오류', '프로필 업데이트 중 오류가 발생했습니다.');
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
      id: 'notifications',
      title: '알림 설정',
      icon: 'notifications-outline',
      onPress: () => Alert.alert('알림', '알림 설정 기능은 준비 중입니다.'),
    },
    {
      id: 'privacy',
      title: '개인정보 처리방침',
      icon: 'shield-outline',
      onPress: () => Alert.alert('개인정보', '개인정보 처리방침 페이지로 이동합니다.'),
    },
    {
      id: 'terms',
      title: '서비스 이용약관',
      icon: 'document-text-outline',
      onPress: () => Alert.alert('약관', '서비스 이용약관 페이지로 이동합니다.'),
    },
    {
      id: 'support',
      title: '고객지원',
      icon: 'help-circle-outline',
      onPress: () => Alert.alert('고객지원', '고객지원 페이지로 이동합니다.'),
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
          <Text style={styles.loadingText}>프로필을 불러오는 중...</Text>
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
            {(userProfile?.campus || userProfile?.student_id || userProfile?.role) && (
              <View style={styles.profileDetails}>
                {userProfile?.campus && (
                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={16} color={colors['grey-02']} />
                    <Text style={styles.detailText}>{userProfile.campus}</Text>
                  </View>
                )}
                {userProfile?.student_id && (
                  <View style={styles.detailItem}>
                    <Ionicons name="card-outline" size={16} color={colors['grey-02']} />
                    <Text style={styles.detailText}>학번: {userProfile.student_id}</Text>
                  </View>
                )}
                {userProfile?.role && (
                  <View style={styles.detailItem}>
                    <Ionicons name="person-outline" size={16} color={colors['grey-02']} />
                    <Text style={styles.detailText}>{getRoleDisplayName(userProfile.role)}</Text>
                  </View>
                )}
              </View>
            )}
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
        </ScrollView>

        {/* 프로필 수정 모달 */}
        <GroupModal
          visible={editModalVisible}
          onClose={() => !updating && setEditModalVisible(false)}
          title="프로필 수정">
          <Text style={styles.inputLabel}>이름</Text>
          <TextInput
            style={styles.textInput}
            value={editData.name}
            onChangeText={(text) => setEditData({ ...editData, name: text })}
            placeholder="이름을 입력하세요"
            editable={!updating}
          />

          <Text style={styles.inputLabel}>캠퍼스</Text>
          <TextInput
            style={styles.textInput}
            value={editData.campus}
            onChangeText={(text) => setEditData({ ...editData, campus: text })}
            placeholder="캠퍼스를 입력하세요 (선택사항)"
            editable={!updating}
          />

          <Text style={styles.inputLabel}>학번</Text>
          <TextInput
            style={styles.textInput}
            value={editData.student_id}
            onChangeText={(text) => setEditData({ ...editData, student_id: text })}
            placeholder="학번을 입력하세요 (선택사항)"
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
});

export default MyPageScreen;
