// NOTE - App.tsx 경로는 반드시 src/app/App.tsx 설정합니다.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAppFonts } from '@/hooks/useAppFonts';
import { useAuthStore } from '@/store/authStore';
import AppNavigator from '@/navigation/AppNavigator';
import { View, StyleSheet, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { initializeGoogleSignIn } from '@/utils/auth';
import { getGroupByInviteToken, joinGroupByInvite } from '@/apis/groupApi';
import { NavigationService } from '@/utils/NavigationService';
import AlertModal from '@/components/common/AlertModal';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { supabase } from '@/utils/supabaseClient';

SplashScreen.preventAutoHideAsync();

// iOS에서 WebBrowser 최적화 설정
if (Platform.OS === 'ios') {
  WebBrowser.maybeCompleteAuthSession();
}

const queryClient = new QueryClient();

// 딥링크 처리를 위한 전역 변수
let pendingDeepLink: { groupId: string; token: string } | null = null;

export default function App() {
  const { session, isInitialized, initializeAuth } = useAuthStore();
  const { fontsLoaded, fontError } = useAppFonts();
  const hiddenRef = useRef(false); // splash screen 숨김 중복 방지
  const [appIsReady, setAppIsReady] = useState(false);

  // AlertModal 상태 관리
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: undefined,
  });

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertModal({ visible: true, title, message, onConfirm });
  };

  const hideAlert = () => {
    if (alertModal.onConfirm) {
      alertModal.onConfirm();
    }
    setAlertModal({ visible: false, title: '', message: '', onConfirm: undefined });
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initializeAuth();
        await initializeGoogleSignIn();
      } catch (error) {
        console.error('[App.tsx] App initialization error:', error);
        Toast.show({
          type: 'error',
          text1: '앱 초기화 오류',
          text2: '네트워크 연결을 확인해주세요.',
          visibilityTime: 4000,
        });
      }
    };

    initializeApp();
  }, [initializeAuth]);

  // 딥링크 처리 함수
  const handleDeepLink = async (url: string) => {
    // URL에서 그룹 ID와 토큰 추출
    const matches = url.match(/invite\/([^\/]+)\/([^\/]+)/);
    if (!matches) {
      return;
    }

    const [, groupId, inviteToken] = matches;
    console.log('📊 Extracted data:', { groupId, inviteToken });

    if (!session) {
      console.log('❌ User not authenticated');
      showAlert('로그인 필요', '초대 링크를 사용하려면 먼저 로그인해주세요.');
      return;
    }

    try {
      console.log('🔍 Getting group info by invite token...');

      // 토큰으로 그룹 정보 조회
      const result = await getGroupByInviteToken(inviteToken);
      console.log('✅ Group info retrieved:', result);

      if (!result) {
        showAlert('초대 링크 오류', '유효하지 않거나 만료된 초대 링크입니다.');
        return;
      }

      // 그룹 ID가 일치하는지 확인
      if (result.group_id !== groupId) {
        showAlert('초대 링크 오류', '초대 링크가 올바르지 않습니다.');
        return;
      }

      // 이미 가입되어 있는지 먼저 확인
      console.log('🔍 Checking if already a member...');
      const { data: existingMembership } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', result.group_id)
        .eq('user_id', session.user.id)
        .single();

      if (existingMembership) {
        // 이미 가입된 경우
        console.log('✅ Already a member, showing info message');
        showAlert(
          '이미 가입된 순',
          `"${result.groups?.name || '순'}" 순에 이미 가입되어 있습니다.\n\n해당 순 페이지로 이동하시겠습니까?`,
          () => {
            // 이미 가입된 순 페이지로 이동
            NavigationService.navigate('GroupDetail', {
              groupId: result.group_id,
              groupName: result.groups?.name || '순',
            });
          }
        );
        return;
      }

      // 그룹 가입 시도
      const joinResult = await joinGroupByInvite(inviteToken);
      console.log('✅ Join result:', joinResult);

      if (joinResult.success) {
        showAlert(
          '가입 완료!',
          `"${result.groups?.name || '순'}" 순에 성공적으로 가입되었습니다.\n\n해당 순 페이지로 이동하시겠습니까?`,
          () => {
            // 성공 시 해당 그룹 페이지로 자동 이동
            NavigationService.navigate('GroupDetail', {
              groupId: result.group_id,
              groupName: result.groups?.name || '순',
            });
          }
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        showAlert('초대 링크 오류', error.message);
      } else {
        showAlert('초대 링크 오류', '초대 링크 처리 중 오류가 발생했습니다.');
      }
    }
  };

  // 앱이 열려있을 때 딥링크 처리
  useEffect(() => {
    const linkingListener = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // 앱이 닫혀있을 때 딥링크로 열린 경우 처리
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      linkingListener.remove();
    };
  }, [session]);

  // 앱 초기화 완료 후 보류된 딥링크 처리
  useEffect(() => {
    if (isInitialized && pendingDeepLink) {
      const { groupId, token } = pendingDeepLink;
      pendingDeepLink = null;

      // 잠시 후 처리 (네비게이션 준비 시간)
      setTimeout(async () => {
        console.log('[App.tsx] Processing pending deep link:', { groupId, token });

        try {
          Toast.show({
            type: 'info',
            text1: '순 초대 처리 중...',
            text2: '잠시만 기다려주세요.',
            visibilityTime: 2000,
          });

          // 실제 초대 처리 API 호출
          const result = await joinGroupByInvite(token);

          Toast.show({
            type: 'success',
            text1: '순 가입 완료!',
            text2: `'${result.group.name}' 순에 참여하게 되었습니다.`,
            visibilityTime: 3000,
          });

          // TODO: 네비게이션을 통해 해당 그룹 페이지로 이동
          console.log('[App.tsx] Successfully joined group via pending link:', result.group.name);
        } catch (error) {
          console.error('[App.tsx] Pending group invite error:', error);

          const errorMessage =
            error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
          Toast.show({
            type: 'error',
            text1: '초대 링크 오류',
            text2: errorMessage,
            visibilityTime: 3000,
          });
        }
      }, 1000);
    }
  }, [isInitialized]);

  // 앱 준비 완료 상태 확인 및 splash screen 숨기기
  useEffect(() => {
    const hideSplashScreen = async () => {
      // 이미 숨겼거나 조건이 충족되지 않은 경우 return
      if (hiddenRef.current || (!fontsLoaded && !fontError) || !isInitialized) {
        return;
      }

      try {
        hiddenRef.current = true; // 중복 실행 방지
        setAppIsReady(true); // 앱 준비 완료 설정
        await SplashScreen.hideAsync();
      } catch (error) {
        console.error('[App.tsx] Error hiding splash screen:', error);
        hiddenRef.current = false; // 에러 발생 시 재시도 가능하도록
        Toast.show({
          type: 'error',
          text1: '앱 시작 오류',
          text2: '앱을 다시 시작해주세요.',
          visibilityTime: 3000,
        });
      }
    };

    hideSplashScreen();
  }, [fontsLoaded, fontError, isInitialized]);

  // 폰트 로딩 에러 처리 (iOS에서는 토스트 표시 안함)
  useEffect(() => {
    if (fontError) {
      console.warn('[App.tsx] Font loading error detected:', fontError);

      // iOS에서는 경고만 로그에 남기고 토스트는 표시하지 않음
      if (Platform.OS !== 'ios') {
        Toast.show({
          type: 'warn',
          text1: '폰트 로딩 실패',
          text2: '시스템 기본 폰트를 사용합니다.',
          visibilityTime: 2000,
        });
      }
    }
  }, [fontError]);

  // 타임아웃으로 강제 숨기기 (최대 5초 후)
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (!hiddenRef.current) {
        try {
          hiddenRef.current = true;
          setAppIsReady(true); // 앱 준비 완료 설정
          SplashScreen.hide();
          Toast.show({
            type: 'info',
            text1: '앱 로딩 완료',
            text2: '일부 기능이 늦게 로드될 수 있습니다.',
            visibilityTime: 2000,
          });
        } catch (error) {
          console.error('[App.tsx] Error in timeout splash screen hide:', error);
          Toast.show({
            type: 'error',
            text1: '앱 시작 문제',
            text2: '앱을 완전히 종료 후 다시 실행해주세요.',
            visibilityTime: 4000,
          });
        }
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, []);

  const onLayoutRootView = useCallback(() => {
    // 레이아웃 완료 시 필요한 경우 추가 처리
  }, []);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <BottomSheetModalProvider>
              <View style={styles.appContainer} onLayout={onLayoutRootView}>
                <AppNavigator />
              </View>
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </QueryClientProvider>

        {/* Custom Alert Modal */}
        <AlertModal
          visible={alertModal.visible}
          title={alertModal.title}
          message={alertModal.message}
          onClose={hideAlert}
          confirmText={alertModal.onConfirm ? '확인' : '확인'}
        />

        <Toast />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
});
