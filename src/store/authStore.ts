import { create, StateCreator } from 'zustand';
import { supabase } from '@/utils/supabaseClient';
import { Session, User } from '@supabase/supabase-js';

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
        console.error('[AuthStore] initializeAuth: Supabase getSession error:', sessionError.message);
        set({ session: null, user: null, loading: false, isInitialized: true, profileCompleted: false });
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
          console.error('[AuthStore] initializeAuth: Error fetching user profile:', profileError.message);
        }
        
        const isProfileComplete = userProfile && userProfile.name && userProfile.campus && userProfile.student_id && userProfile.role;
        set({
          session: initialSession,
          user: initialSession.user,
          loading: false,
          isInitialized: true,
          profileCompleted: !!isProfileComplete, // 프로필 완전 여부에 따라 설정
        });
      } else {
        // console.log('[AuthStore] initializeAuth: No session found');
        set({ session: null, user: null, loading: false, isInitialized: true, profileCompleted: false });
      }
    } catch (error) {
      console.error('[AuthStore] initializeAuth: Exception:', error);
      set({ session: null, user: null, loading: false, isInitialized: true, profileCompleted: false });
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
            console.error('[AuthStore] setSessionData: Error fetching user profile:', profileError.message);
          }
          const isProfileComplete = userProfile && userProfile.name && userProfile.campus && userProfile.student_id && userProfile.role;
          set({ session, user, loading: false, isInitialized: true, profileCompleted: !!isProfileComplete });
        });
    } else {
      set({ session: null, user: null, loading: false, isInitialized: true, profileCompleted: false });
    }
  },

  signOut: async () => {
    // console.log('[AuthStore] signOut: Called');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[AuthStore] signOut: Supabase signOut error:', error.message);
    }
    set({ session: null, user: null, loading: false, profileCompleted: false }); // 로그아웃 시 모든 상태 초기화
  },

  setProfileCompleted: (completed) => {
    set({ profileCompleted: completed, loading: false }); 
  },
});

export const useAuthStore = create<AuthState>(authStoreCreator);
