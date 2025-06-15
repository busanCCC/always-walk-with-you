import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '@/navigation/types';

// 네비게이션 ref 생성
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * 딥링크 처리를 위한 네비게이션 유틸리티
 */
export const NavigationUtils = {
  /**
   * 특정 스크린으로 네비게이션 (딥링크 처리용)
   */
  navigate<T extends keyof RootStackParamList>(name: T, params?: RootStackParamList[T]) {
    if (navigationRef.isReady()) {
      // @ts-ignore - React Navigation의 복잡한 타입 체크를 우회
      navigationRef.navigate(name, params);
    }
  },

  /**
   * 네비게이션이 준비되었는지 확인
   */
  isReady() {
    return navigationRef.isReady();
  },
};
