import { supabase } from '../utils/supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import { Session, User } from '@supabase/supabase-js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';

// 앱의 커스텀 스킴으로 직접 리다이렉트 (Expo 개발 서버 우회)
const redirectUri = 'alwayswalkwithyouauth://auth/callback';

console.log('OAuth Redirect URI:', redirectUri);

// iOS에서 WebBrowser 최적화 설정
WebBrowser.maybeCompleteAuthSession();

export interface LoginResult {
  session: Session | null;
  user: User | null;
  error?: Error | string | null;
}

export interface KakaoLoginResult extends LoginResult {}
export interface GoogleLoginResult extends LoginResult {}

export const signInWithKakao = async (): Promise<KakaoLoginResult> => {
  try {
    console.log('Starting Kakao login with redirect URI:', redirectUri);

    const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: redirectUri,
        // iOS에서 더 안정적인 OAuth를 위한 옵션 추가
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (oauthError) {
      console.error('Kakao OAuth error:', oauthError.message);
      return { session: null, user: null, error: oauthError.message };
    }

    if (!oauthData.url) {
      console.warn('Kakao OAuth URL not found.');
      return { session: null, user: null, error: 'OAuth URL not found' };
    }

    console.log('Opening auth session for Kakao:', oauthData.url);

    // iOS에서 더 안정적인 WebBrowser 설정
    const result = await WebBrowser.openAuthSessionAsync(oauthData.url, redirectUri, {
      // iOS에서 시스템 브라우저 사용 대신 in-app 브라우저 사용
      preferEphemeralSession: false,
      // iOS에서 더 나은 호환성을 위해
      showInRecents: false,
    });

    console.log('Kakao auth session result:', result);

    if (result.type === 'success' && result.url) {
      // URL 파싱 개선
      const urlParts = result.url.split('#');
      if (urlParts.length < 2) {
        console.warn('Invalid OAuth callback URL format:', result.url);
        return { session: null, user: null, error: 'Invalid OAuth callback URL format' };
      }

      const params = new URLSearchParams(urlParts[1]);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Supabase setSession error:', sessionError.message);
          return { session: null, user: null, error: sessionError.message };
        }
        if (sessionData.session && sessionData.user) {
          return { session: sessionData.session, user: sessionData.user };
        }
        console.warn('setSession successful but session or user data is missing.');
        return {
          session: null,
          user: null,
          error: 'Session or user data missing after setSession.',
        };
      }
      console.warn('Access token or refresh token not found in URL.');
      return { session: null, user: null, error: 'Tokens not found in URL.' };
    } else if (result.type === 'cancel') {
      console.log('Kakao login was cancelled by user');
      return { session: null, user: null, error: 'Login cancelled by user' };
    }

    console.warn('Kakao login was cancelled or failed:', result);
    return { session: null, user: null, error: 'Login cancelled or failed.' };
  } catch (err: any) {
    console.error('Exception during Kakao login process:', err);
    return { session: null, user: null, error: err.message || 'Unknown error during login.' };
  }
};

// Google 로그인 초기화 함수 (앱 시작 시 호출)
export const initializeGoogleSignIn = async () => {
  try {
    await GoogleSignin.configure({
      webClientId: '363398054005-mrupertl7685gk0boohs3d89svecg95m.apps.googleusercontent.com', // Google Cloud Console에서 생성한 웹 클라이언트 ID
      iosClientId: '363398054005-ehj5ic5g55jvk038ltqo65crooto3u5d.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  } catch (error) {
    console.error('Google SignIn configuration error:', error);
  }
};

export const signInWithGoogle = async (): Promise<GoogleLoginResult> => {
  try {
    console.log('Starting Google login...');

    // Google 로그인 체크
    await GoogleSignin.hasPlayServices();

    // Google 로그인 실행
    const userInfo = await GoogleSignin.signIn();
    console.log('Google sign-in successful, userInfo:', userInfo);

    if (!userInfo.data?.idToken) {
      console.error('Google ID token not found in userInfo');
      return { session: null, user: null, error: 'Google ID token not found' };
    }

    console.log('Authenticating with Supabase using Google ID token...');

    // Supabase에 Google ID 토큰으로 로그인
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: userInfo.data.idToken,
    });

    if (sessionError) {
      console.error('Supabase Google login error:', sessionError.message);
      return { session: null, user: null, error: sessionError.message };
    }

    if (sessionData.session && sessionData.user) {
      console.log('Google login successful!');
      return { session: sessionData.session, user: sessionData.user };
    }

    console.error('Session or user data missing after Google login');
    return { session: null, user: null, error: 'Session or user data missing' };
  } catch (err: any) {
    console.error('Google login error:', err);

    if (err.code === 'sign_in_cancelled') {
      return { session: null, user: null, error: 'Google login was cancelled' };
    } else if (err.code === 'in_progress') {
      return { session: null, user: null, error: 'Google login is already in progress' };
    } else if (err.code === 'play_services_not_available') {
      return { session: null, user: null, error: 'Google Play Services not available' };
    }

    return { session: null, user: null, error: err.message || 'Unknown Google login error' };
  }
};

export const signOut = async (): Promise<{ error: Error | null }> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
  }
  return { error };
};
