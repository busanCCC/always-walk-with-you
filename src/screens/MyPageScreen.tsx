import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/utils/supabaseClient';
import UserIcon from '@/assets/svg/user-icon.svg';

interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  campus: string | null;
  student_id: string | null;
  role: string | null;
  profile_img: string | null;
  // users 테이블에 있는 다른 필드들 추가 가능
}

const MyPageScreen = () => {
  const { user: authUser, signOut } = useAuthStore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (authUser?.id) {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*') // 필요에 따라 선택할 컬럼 지정
            .eq('id', authUser.id)
            .single();

          if (error) {
            console.error('Error fetching user profile in MyPage:', error.message);
            // PGRST116: row not found, 이는 프로필이 아직 없을 수 있음을 의미
            if (error.code !== 'PGRST116') {
              // 다른 종류의 오류는 사용자에게 알릴 수 있음
            }
          }
          setUserProfile(data as UserProfile);
        } catch (e) {
          console.error('Exception fetching user profile in MyPage:', e);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false); // authUser가 없으면 로딩 중단
      }
    };

    fetchUserProfile();
  }, [authUser]);

  const handleSignOut = async () => {
    await signOut();
  };

  const displayName = userProfile?.name || authUser?.email?.split('@')[0] || '사용자';
  const email = userProfile?.email || authUser?.email || '이메일 정보 없음';
  const profileImageUrl = userProfile?.profile_img;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.profileCard}>
          {profileImageUrl ? (
            <Image source={{ uri: profileImageUrl }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileImage, styles.profileIconContainer]}>
              <UserIcon width={60} height={60} fill={theme.colors['grey-02']} />
            </View>
          )}
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{email}</Text>
          {userProfile?.campus && (
            <Text style={styles.profileMeta}>캠퍼스: {userProfile.campus}</Text>
          )}
          {userProfile?.role && <Text style={styles.profileMeta}>역할: {userProfile.role}</Text>}
        </View>

        {/* 메뉴 리스트 (주석 처리됨, 필요시 확장) */}
        {/* <View style={styles.menuSection}> ... </View> */}

        <View style={styles.logoutSection}>
          <TouchableOpacity onPress={handleSignOut} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>로그아웃</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors['light-grey-01'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing['4'], // 16px
    paddingVertical: theme.spacing['5'],
  },
  profileCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing['4'], // 16px
    padding: theme.spacing['5'],
    alignItems: 'center',
    marginBottom: theme.spacing['6'],
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: theme.spacing['4'],
    backgroundColor: theme.colors['light-grey-02'], // 이미지 로딩 전 또는 아이콘 배경
  },
  profileIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileName: {
    fontFamily: theme.fonts.bold,
    fontSize: theme.fontStyles['xl-tight'].fontSize,
    color: theme.colors['dark-grey-02'],
    marginBottom: theme.spacing['1'],
  },
  profileEmail: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontStyles['sm-normal'].fontSize,
    color: theme.colors['grey-02'],
    marginBottom: theme.spacing['2.5'],
  },
  profileMeta: {
    fontFamily: theme.fonts.regular,
    fontSize: theme.fontStyles['xs-normal'].fontSize,
    color: theme.colors['grey-03'],
    marginTop: theme.spacing['1'],
  },
  menuSection: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing['4'], // 16
    marginBottom: theme.spacing['6'],
  },
  logoutSection: {
    marginTop: theme.spacing['2'], // 메뉴 섹션과의 간격 (메뉴 섹션이 없을 경우 조정)
  },
  logoutButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.spacing['4'], // 16
    paddingVertical: theme.spacing['4'], // theme.spacing['3.5'] 에서 변경 (14px -> 16px)
    alignItems: 'center',
  },
  logoutButtonText: {
    fontFamily: theme.fonts.medium,
    fontSize: theme.fontStyles['base-normal'].fontSize,
    color: theme.colors.primary.DEFAULT, // 토스 느낌으로 파란색 사용
  },
});

export default MyPageScreen;
