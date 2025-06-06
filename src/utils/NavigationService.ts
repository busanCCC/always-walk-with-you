import { createNavigationContainerRef, StackActions } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';

// 네비게이션 ref 생성
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * 네비게이션 서비스 - 앱 전역에서 네비게이션 제어
 */
export const NavigationService = {
  /**
   * 특정 스크린으로 네비게이션
   */
  navigate<T extends keyof RootStackParamList>(name: T, params?: RootStackParamList[T]) {
    if (navigationRef.isReady()) {
      // @ts-ignore - React Navigation의 복잡한 타입 체크를 우회
      navigationRef.navigate(name, params);
    }
  },

  /**
   * 현재 스택을 리셋하고 특정 스크린으로 이동
   */
  reset<T extends keyof RootStackParamList>(name: T, params?: RootStackParamList[T]) {
    if (navigationRef.isReady()) {
      navigationRef.reset({
        index: 0,
        routes: [{ name: name as any, params: params as any }],
      });
    }
  },

  /**
   * 뒤로 가기
   */
  goBack() {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
    }
  },

  /**
   * 특정 스크린을 스택에 푸시
   */
  push<T extends keyof RootStackParamList>(name: T, params?: RootStackParamList[T]) {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(StackActions.push(name as any, params as any));
    }
  },

  /**
   * 네비게이션이 준비되었는지 확인
   */
  isReady() {
    return navigationRef.isReady();
  },
};
