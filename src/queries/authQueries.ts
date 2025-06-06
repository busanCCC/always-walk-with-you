import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { AuthError } from '@supabase/supabase-js';
import { useAuthStore } from '@/store/authStore';
import {
  signInWithKakao as apiSignInWithKakao,
  signInWithGoogle as apiSignInWithGoogle,
  signInWithApple as apiSignInWithApple,
  signOut as apiSignOut,
} from '@/apis/authApi';
import type { KakaoLoginResult, GoogleLoginResult, AppleLoginResult } from '@/apis/authApi';

export const authQueryKeys = {
  session: ['session'] as const,
};

export const useSignInWithKakaoMutation = (): UseMutationResult<
  KakaoLoginResult,
  AuthError,
  void,
  unknown
> => {
  const { setSessionData } = useAuthStore.getState();

  return useMutation<KakaoLoginResult, AuthError, void, unknown>({
    mutationFn: apiSignInWithKakao,
    onSuccess: (data: KakaoLoginResult) => {
      if (data.error) {
        console.error('Error signing in with Kakao (returned by API):', data.error);
        setSessionData(null, null);
      } else if (data.session && data.user) {
        setSessionData(data.session, data.user);
      } else {
        console.error(
          'signInWithKakaoMutation: Session or user data is missing and no error reported.'
        );
        setSessionData(null, null);
      }
    },
    onError: (error: AuthError) => {
      console.error('Error signing in with Kakao (mutation error):', error.message);
      setSessionData(null, null);
    },
  });
};

export const useSignInWithGoogleMutation = (): UseMutationResult<
  GoogleLoginResult,
  AuthError,
  void,
  unknown
> => {
  const { setSessionData } = useAuthStore.getState();

  return useMutation<GoogleLoginResult, AuthError, void, unknown>({
    mutationFn: apiSignInWithGoogle,
    onSuccess: (data: GoogleLoginResult) => {
      if (data.error) {
        console.error('Error signing in with Google (returned by API):', data.error);
        setSessionData(null, null);
      } else if (data.session && data.user) {
        setSessionData(data.session, data.user);
      } else {
        console.error(
          'signInWithGoogleMutation: Session or user data is missing and no error reported.'
        );
        setSessionData(null, null);
      }
    },
    onError: (error: AuthError) => {
      console.error('Error signing in with Google (mutation error):', error.message);
      setSessionData(null, null);
    },
  });
};

export const useSignInWithAppleMutation = (): UseMutationResult<
  AppleLoginResult,
  AuthError,
  void,
  unknown
> => {
  const { setSessionData } = useAuthStore.getState();

  return useMutation<AppleLoginResult, AuthError, void, unknown>({
    mutationFn: apiSignInWithApple,
    onSuccess: (data: AppleLoginResult) => {
      if (data.error) {
        console.error('Error signing in with Apple (returned by API):', data.error);
        setSessionData(null, null);
      } else if (data.session && data.user) {
        setSessionData(data.session, data.user);
      } else {
        console.error(
          'signInWithAppleMutation: Session or user data is missing and no error reported.'
        );
        setSessionData(null, null);
      }
    },
    onError: (error: AuthError) => {
      console.error('Error signing in with Apple (mutation error):', error.message);
      setSessionData(null, null);
    },
  });
};

export const useSignOutMutation = (): UseMutationResult<
  { error: Error | null },
  AuthError,
  void,
  unknown
> => {
  const storeSignOut = useAuthStore((state) => state.signOut);

  return useMutation<{ error: Error | null }, AuthError, void, unknown>({
    mutationFn: apiSignOut,
    onSuccess: (data: { error: Error | null }) => {
      if (data.error) {
        console.error('Error signing out (returned by API):', data.error.message);
      } else {
        storeSignOut();
      }
    },
    onError: (error: AuthError) => {
      console.error('Error signing out (mutation error):', error.message);
    },
  });
};
