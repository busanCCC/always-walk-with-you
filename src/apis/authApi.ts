import { supabase } from '../utils/supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, AuthSessionRedirectUriOptions } from 'expo-auth-session';
import { Session, User } from '@supabase/supabase-js';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const redirectUriOptions: AuthSessionRedirectUriOptions & { useProxy?: boolean } = {
  useProxy: true,
};
const redirectUri = makeRedirectUri(redirectUriOptions);

export interface LoginResult {
  session: Session | null;
  user: User | null;
  error?: Error | string | null;
}

export interface KakaoLoginResult extends LoginResult {}
export interface GoogleLoginResult extends LoginResult {}

export const signInWithKakao = async (): Promise<KakaoLoginResult> => {
  try {
    const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: redirectUri,
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

    const result = await WebBrowser.openAuthSessionAsync(oauthData.url, redirectUri);

    if (result.type === 'success' && result.url) {
      const params = new URLSearchParams(result.url.split('#')[1]);
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
      webClientId: '773201720169-mklk0et95leh8p423b4mcjbrmt9gem3g.apps.googleusercontent.com', // Google Cloud Console에서 생성한 웹 클라이언트 ID
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  } catch (error) {
    console.error('Google SignIn configuration error:', error);
  }
};

export const signInWithGoogle = async (): Promise<GoogleLoginResult> => {
  try {
    // Google 로그인 체크
    await GoogleSignin.hasPlayServices();

    // Google 로그인 실행
    const userInfo = await GoogleSignin.signIn();

    if (!userInfo.data?.idToken) {
      return { session: null, user: null, error: 'Google ID token not found' };
    }

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
      return { session: sessionData.session, user: sessionData.user };
    }

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
