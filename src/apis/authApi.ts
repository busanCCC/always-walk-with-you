import { supabase } from '../utils/supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, AuthSessionRedirectUriOptions } from 'expo-auth-session';
import { Session, User } from '@supabase/supabase-js';

const redirectUriOptions: AuthSessionRedirectUriOptions & { useProxy?: boolean } = {
  useProxy: true,
};
const redirectUri = makeRedirectUri(redirectUriOptions);

export interface KakaoLoginResult {
  session: Session | null;
  user: User | null;
  error?: Error | string | null;
}

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

export const signOut = async (): Promise<{ error: Error | null }> => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
  }
  return { error };
};
