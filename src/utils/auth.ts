import { useAuthStore } from '@/store/authStore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

/**
 * Google 로그인 초기화
 * Timeout과 에러 처리 강화
 */
export const initializeGoogleSignIn = async (): Promise<void> => {
  const timeoutMs = 5000; // 5초 timeout

  const initPromise = async () => {
    try {
      GoogleSignin.configure({
        webClientId: '363398054005-mrupertl7685gk0boohs3d89svecg95m.apps.googleusercontent.com',
        iosClientId: '363398054005-ehj5ic5g55jvk038ltqo65crooto3u5d.apps.googleusercontent.com',
        offlineAccess: true,
        forceCodeForRefreshToken: true,
      });

      console.log('[Auth] Google Sign-In configured successfully');
    } catch (error) {
      console.error('[Auth] Google Sign-In configuration failed:', error);
      // Google 로그인 실패는 앱 시작을 막지 않음
    }
  };

  return Promise.race([
    initPromise(),
    new Promise<void>((resolve) =>
      setTimeout(() => {
        console.warn('[Auth] Google Sign-In initialization timeout, continuing without it');
        resolve();
      }, timeoutMs)
    ),
  ]);
};
