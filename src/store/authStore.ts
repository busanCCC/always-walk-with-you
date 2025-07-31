import { create, StateCreator } from 'zustand';
import { supabase } from '@/utils/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session, User } from '@supabase/supabase-js';
import NetInfo from '@react-native-community/netinfo';
import Toast from 'react-native-toast-message';
import { networkManager } from '@/utils/networkManager';

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

// 앱 시작 시 즉시 로컬 세션 복원을 시도하는 함수
const restoreLocalSession = async (): Promise<{
  session: Session | null;
  user: User | null;
  profileCompleted: boolean;
}> => {
  try {
    const savedSession = await AsyncStorage.getItem('user_session');
    const savedProfileCompleted = await AsyncStorage.getItem('profile_completed');

    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      console.log('[AuthStore] 로컬 세션 복원 완료');
      return {
        session: sessionData.session,
        user: sessionData.user,
        profileCompleted: savedProfileCompleted === 'true',
      };
    }
  } catch (error) {
    console.error('[AuthStore] 로컬 세션 복원 오류:', error);
  }

  return {
    session: null,
    user: null,
    profileCompleted: false,
  };
};

const authStoreCreator: StateCreator<AuthState> = (set, get) => {
  // 앱 시작과 동시에 로컬 세션 복원 시도
  restoreLocalSession().then((localSession) => {
    if (localSession.session) {
      console.log('[AuthStore] 앱 시작 시 로컬 세션 자동 복원');
      set({
        session: localSession.session,
        user: localSession.user,
        loading: false,
        isInitialized: true,
        profileCompleted: localSession.profileCompleted,
      });
    }
  });

  return {
    session: null,
    user: null,
    loading: true,
    isInitialized: false,
    profileCompleted: false,

    initializeAuth: async () => {
      set({ loading: true, isInitialized: false });

      try {
        // 1단계: 로컬 세션 먼저 확인 (즉시)
        const localSession = await restoreLocalSession();

        if (localSession.session) {
          console.log('[AuthStore] 1단계: 로컬 세션으로 초기화');
          set({
            session: localSession.session,
            user: localSession.user,
            loading: false,
            isInitialized: true,
            profileCompleted: localSession.profileCompleted,
          });
        }

        // 2단계: 네트워크 상태 확인
        const isOnline = networkManager.isOnline();

        console.log(`[AuthStore] 네트워크 상태: ${isOnline ? '온라인' : '오프라인'}`);

        if (!isOnline) {
          // 오프라인: 로컬 세션으로 완료
          if (localSession.session) {
            Toast.show({
              type: 'info',
              text1: '오프라인 모드',
              text2: '저장된 로그인 정보로 진입합니다.',
              visibilityTime: 2000,
            });
          } else {
            console.log('[AuthStore] 저장된 로컬 세션 없음');
            set({
              session: null,
              user: null,
              loading: false,
              isInitialized: true,
              profileCompleted: false,
            });
          }
          return;
        }

        // 3단계: 온라인 상태 - 서버에서 세션 검증
        console.log('[AuthStore] 온라인 모드: 서버 세션 확인 중...');

        const {
          data: { session: initialSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('[AuthStore] Supabase getSession 오류:', sessionError.message);

          // 서버 오류 시 로컬 세션으로 폴백
          if (localSession.session) {
            console.log('[AuthStore] 서버 오류 - 로컬 세션 사용');
            Toast.show({
              type: 'info',
              text1: '서버 연결 실패',
              text2: '저장된 로그인 정보를 사용합니다.',
              visibilityTime: 2000,
            });
            return;
          }

          set({
            session: null,
            user: null,
            loading: false,
            isInitialized: true,
            profileCompleted: false,
          });
          return;
        }

        if (initialSession) {
          // 세션이 있으면 로컬에 백업 저장
          await AsyncStorage.setItem(
            'user_session',
            JSON.stringify({
              session: initialSession,
              user: initialSession.user,
            })
          );

          // 프로필 정보 확인
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('id, name')
            .eq('id', initialSession.user.id)
            .single();

          console.log('[AuthStore] 사용자 프로필:', userProfile);

          if (profileError && profileError.code !== 'PGRST116') {
            console.error('[AuthStore] 프로필 정보 로딩 오류:', profileError.message);
          }

          const isProfileComplete = userProfile && userProfile.name;
          await AsyncStorage.setItem('profile_completed', isProfileComplete ? 'true' : 'false');

          set({
            session: initialSession,
            user: initialSession.user,
            loading: false,
            isInitialized: true,
            profileCompleted: !!isProfileComplete,
          });
        } else {
          // 세션이 없으면 로컬 저장소도 초기화
          await AsyncStorage.removeItem('user_session');
          await AsyncStorage.removeItem('profile_completed');

          set({
            session: null,
            user: null,
            loading: false,
            isInitialized: true,
            profileCompleted: false,
          });
        }
      } catch (error) {
        console.error('[AuthStore] initializeAuth 예외:', error);

        // 예외 발생 시에도 로컬 세션 확인
        const localSession = await restoreLocalSession();
        if (localSession.session) {
          console.log('[AuthStore] 예외 상황에서 로컬 세션 사용');
          set({
            session: localSession.session,
            user: localSession.user,
            loading: false,
            isInitialized: true,
            profileCompleted: localSession.profileCompleted,
          });

          Toast.show({
            type: 'info',
            text1: '연결 오류',
            text2: '저장된 로그인 정보를 사용합니다.',
            visibilityTime: 2000,
          });
          return;
        }

        set({
          session: null,
          user: null,
          loading: false,
          isInitialized: true,
          profileCompleted: false,
        });
      }
    },

    setSessionData: async (session: Session | null, user: User | null) => {
      set({ session, user });

      // 세션 데이터가 있으면 로컬에 저장
      if (session && user) {
        try {
          await AsyncStorage.setItem(
            'user_session',
            JSON.stringify({
              session,
              user,
            })
          );
          console.log('[AuthStore] 세션 로컬 저장 완료');
        } catch (error) {
          console.error('[AuthStore] 세션 로컬 저장 실패:', error);
        }
      } else {
        // 세션이 없으면 로컬 저장소 초기화
        try {
          await AsyncStorage.removeItem('user_session');
          await AsyncStorage.removeItem('profile_completed');
          console.log('[AuthStore] 로컬 세션 초기화 완료');
        } catch (error) {
          console.error('[AuthStore] 로컬 세션 초기화 실패:', error);
        }
      }
    },

    signOut: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('[AuthStore] signOut error:', error.message);
        }
      } catch (error) {
        console.error('[AuthStore] signOut exception:', error);
      } finally {
        // 로컬 저장소도 초기화
        try {
          await AsyncStorage.removeItem('user_session');
          await AsyncStorage.removeItem('profile_completed');
        } catch (error) {
          console.error('[AuthStore] 로그아웃 시 로컬 저장소 초기화 실패:', error);
        }

        set({
          session: null,
          user: null,
          profileCompleted: false,
        });
      }
    },

    setProfileCompleted: async (completed: boolean) => {
      set({ profileCompleted: completed });

      // 프로필 완성 상태도 로컬에 저장
      try {
        await AsyncStorage.setItem('profile_completed', completed ? 'true' : 'false');
      } catch (error) {
        console.error('[AuthStore] 프로필 완성 상태 저장 실패:', error);
      }
    },
  };
};

export const useAuthStore = create<AuthState>(authStoreCreator);
