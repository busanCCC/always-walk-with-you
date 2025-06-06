import { create, StateCreator } from 'zustand';
import { supabase } from '@/utils/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import Toast from 'react-native-toast-message';

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isInitialized: boolean; // 초기 세션 로딩 완료 여부만 표시
  profileCompleted: boolean; // 프로필 완성 여부 상태 추가
  initializeAuth: () => Promise<void>;
  setSessionData: (session: Session | null, user: User | null) => void; // user도 함께 받도록 수정
  signOut: () => Promise<void>;
  setProfileCompleted: (completed: boolean) => void; // 프로필 완성 상태 업데이트 함수 추가
}

const authStoreCreator: StateCreator<AuthState> = (set, get) => ({
  session: null,
  user: null,
  loading: true,
  isInitialized: false,
  profileCompleted: false,

  initializeAuth: async () => {
    set({ loading: true, isInitialized: false, profileCompleted: false });
    try {
      const {
        data: { session: initialSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error(
          '[AuthStore] initializeAuth: Supabase getSession error:',
          sessionError.message
        );
        set({
          session: null,
          user: null,
          loading: false,
          isInitialized: true,
          profileCompleted: false,
        });

        Toast.show({
          type: 'error',
          text1: '로그인 상태 확인 실패',
          text2: '네트워크 연결을 확인해주세요.',
          visibilityTime: 3000,
        });
        return;
      }

      if (initialSession) {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('id, name, campus, student_id, role')
          .eq('id', initialSession.user.id)
          .single();

        console.log('[AuthStore] initializeAuth: User profile:', userProfile);

        if (profileError && profileError.code !== 'PGRST116') {
          console.error(
            '[AuthStore] initializeAuth: Error fetching user profile:',
            profileError.message
          );
          Toast.show({
            type: 'error',
            text1: '사용자 정보 로딩 실패',
            text2: '프로필 정보를 불러올 수 없습니다.',
            visibilityTime: 3000,
          });
        }

        const isProfileComplete =
          userProfile &&
          userProfile.name &&
          userProfile.campus &&
          userProfile.student_id &&
          userProfile.role;
        set({
          session: initialSession,
          user: initialSession.user,
          loading: false,
          isInitialized: true,
          profileCompleted: !!isProfileComplete,
        });
      } else {
        set({
          session: null,
          user: null,
          loading: false,
          isInitialized: true,
          profileCompleted: false,
        });
      }
    } catch (error) {
      console.error('[AuthStore] initializeAuth: Exception:', error);
      set({
        session: null,
        user: null,
        loading: false,
        isInitialized: true,
        profileCompleted: false,
      });

      Toast.show({
        type: 'error',
        text1: '앱 초기화 실패',
        text2: '잠시 후 다시 시도해주세요.',
        visibilityTime: 4000,
      });
    }
  },

  setSessionData: (session, user) => {
    if (session && user) {
      supabase
        .from('users')
        .select('id, name, campus, student_id, role')
        .eq('id', user.id)
        .single()
        .then(({ data: userProfile, error: profileError }) => {
          if (profileError && profileError.code !== 'PGRST116') {
            console.error(
              '[AuthStore] setSessionData: Error fetching user profile:',
              profileError.message
            );
            Toast.show({
              type: 'error',
              text1: '프로필 정보 오류',
              text2: '사용자 정보를 불러오는데 실패했습니다.',
              visibilityTime: 3000,
            });
          }
          const isProfileComplete =
            userProfile &&
            userProfile.name &&
            userProfile.campus &&
            userProfile.student_id &&
            userProfile.role;
          set({
            session,
            user,
            loading: false,
            isInitialized: true,
            profileCompleted: !!isProfileComplete,
          });
        });
    } else {
      set({
        session: null,
        user: null,
        loading: false,
        isInitialized: true,
        profileCompleted: false,
      });
    }
  },

  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[AuthStore] signOut: Supabase signOut error:', error.message);
        Toast.show({
          type: 'error',
          text1: '로그아웃 실패',
          text2: '다시 시도해주세요.',
          visibilityTime: 3000,
        });
        return;
      }

      set({ session: null, user: null, loading: false, profileCompleted: false });
      Toast.show({
        type: 'success',
        text1: '로그아웃 완료',
        text2: '안전하게 로그아웃되었습니다.',
        visibilityTime: 2000,
      });
    } catch (error) {
      console.error('[AuthStore] signOut: Exception:', error);
      Toast.show({
        type: 'error',
        text1: '로그아웃 오류',
        text2: '예상치 못한 오류가 발생했습니다.',
        visibilityTime: 3000,
      });
    }
  },

  setProfileCompleted: (completed) => {
    set({ profileCompleted: completed, loading: false });
  },
});

export const useAuthStore = create<AuthState>(authStoreCreator);
