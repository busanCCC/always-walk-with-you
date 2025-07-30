// NOTE - App.tsx 경로는 반드시 src/app/App.tsx 설정합니다.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useAppFonts } from '@/hooks/useAppFonts';
import { useAuthStore } from '@/store/authStore';
import AppNavigator from '@/navigation/AppNavigator';
import { View, StyleSheet, Platform, StatusBar } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { initializeGoogleSignIn } from '@/apis/authApi';
import { toastConfig } from '@/components/common/CustomToast';
import { getGroupByInviteToken, joinGroupByInvite } from '@/apis/groupApi';
import { fetchEmotions } from '@/apis/journalApi';
import questionsData from '@/assets/data/questions.json';
import { syncEmotionsFromServer, convertToEmotions } from '@/utils/emotionStorage';
import { NavigationUtils } from '@/utils/NavigationService';
import AlertModal from '@/components/common/AlertModal';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { supabase } from '@/utils/supabaseClient';
import { database } from '@/db/database';
import { NetworkProvider } from '@/utils/networkManager';
import { uploadQueueManager } from '@/utils/uploadQueueManager';

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
        // 1. 데이터베이스 초기화 (로컬 DB)
        console.log('🗄️ 로컬 데이터베이스 초기화 중...');
        await database.initialize();

        // 2. 업로드 큐 네트워크 리스너 초기화 (데이터베이스 준비 후)
        console.log('📤 업로드 큐 네트워크 리스너 초기화 중...');
        uploadQueueManager.initializeNetworkListener();

        // 3. 서버와 동기화 (온라인 상태일 때)
        console.log('📡 서버 동기화 시작...');
        await uploadQueueManager.syncWithServer();

        await initializeAuth();

        // Google 로그인 초기화는 별도로 처리 (실패해도 앱 시작을 막지 않음)
        try {
          await initializeGoogleSignIn();
        } catch (googleError) {
          console.warn('Google 로그인 초기화 실패:', googleError);
        }

        // 핵심 데이터들 미리 로드 (백그라운드에서 실행)
        try {
          // 1. 감정 데이터 로컬 동기화 (Supabase -> 로컬 저장소)
          const localEmotions = await syncEmotionsFromServer();
          const emotionsData = convertToEmotions(localEmotions);
          queryClient.setQueryData(['emotions'], emotionsData);

          // 2. 질문 데이터 캐시 (로컬 JSON)
          queryClient.setQueryData(['questions'], questionsData);
        } catch (error) {
          console.warn('핵심 데이터 미리 로딩 실패:', error);

          // 감정 데이터 로딩 실패 시 서버에서 직접 가져오기 (폴백)
          try {
            console.log('🔄 감정 데이터 로딩 실패: 서버에서 직접 가져오는중...');
            const fallbackEmotions = await fetchEmotions();
            queryClient.setQueryData(['emotions'], fallbackEmotions);
          } catch (fallbackError) {
            console.error('❌ 감정 데이터 로딩 실패:', fallbackError);
          }
        }
      } catch (error) {
        console.error('App initialization error:', error);
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

    if (!session) {
      showAlert('로그인 필요', '초대 링크를 사용하려면 먼저 로그인해주세요.');
      return;
    }

    try {
      // 토큰으로 그룹 정보 조회
      const result = await getGroupByInviteToken(inviteToken);

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
      const { data: existingMembership } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', result.group_id)
        .eq('user_id', session.user.id)
        .single();

      if (existingMembership) {
        // 이미 가입된 경우
        showAlert(
          '이미 가입된 순',
          `"${result.groups?.name || '순'}" 순에 이미 가입되어 있습니다.\n\n해당 순 페이지로 이동하시겠습니까?`,
          () => {
            // 이미 가입된 순 페이지로 이동
            NavigationUtils.navigate('GroupDetail', {
              groupId: result.group_id,
              groupName: result.groups?.name || '순',
            });
          }
        );
        return;
      }

      // 그룹 가입 시도
      const joinResult = await joinGroupByInvite(inviteToken);

      if (joinResult.success) {
        showAlert(
          '가입 완료!',
          `"${result.groups?.name || '순'}" 순에 성공적으로 가입되었습니다.\n\n해당 순 페이지로 이동하시겠습니까?`,
          () => {
            // 성공 시 해당 그룹 페이지로 자동 이동
            NavigationUtils.navigate('GroupDetail', {
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

          console.log('Successfully joined group via pending link:', result.group.name);
        } catch (error) {
          console.error('Pending group invite error:', error);

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
        console.error('Error hiding splash screen:', error);
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
      console.warn('Font loading error detected:', fontError);

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
          console.error('Error in timeout splash screen hide:', error);
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
        <NetworkProvider>
          <QueryClientProvider client={queryClient}>
            <SafeAreaProvider>
              <StatusBar barStyle="dark-content" backgroundColor="white" translucent={false} />
              <BottomSheetModalProvider>
                <View style={styles.appContainer} onLayout={onLayoutRootView}>
                  <AppNavigator />
                </View>
              </BottomSheetModalProvider>
            </SafeAreaProvider>
          </QueryClientProvider>
        </NetworkProvider>

        {/* Custom Alert Modal */}
        <AlertModal
          visible={alertModal.visible}
          title={alertModal.title}
          message={alertModal.message}
          onClose={hideAlert}
          confirmText={alertModal.onConfirm ? '확인' : '확인'}
        />

        <Toast config={toastConfig} position="bottom" bottomOffset={50} />
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
});
