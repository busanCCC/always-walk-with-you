import { useFonts } from 'expo-font';
import { Platform } from 'react-native';

export const useAppFonts = () => {
  const [fontsLoaded, fontError] = useFonts({
    'Pretendard-Thin': require('@/assets/fonts/Pretendard-Thin.otf'),
    'Pretendard-ExtraLight': require('@/assets/fonts/Pretendard-ExtraLight.otf'),
    'Pretendard-Light': require('@/assets/fonts/Pretendard-Light.otf'),
    'Pretendard-Regular': require('@/assets/fonts/Pretendard-Regular.otf'),
    'Pretendard-Medium': require('@/assets/fonts/Pretendard-Medium.otf'),
    'Pretendard-SemiBold': require('@/assets/fonts/Pretendard-SemiBold.otf'),
    'Pretendard-Bold': require('@/assets/fonts/Pretendard-Bold.otf'),
    'Pretendard-ExtraBold': require('@/assets/fonts/Pretendard-ExtraBold.otf'),
    'Pretendard-Black': require('@/assets/fonts/Pretendard-Black.otf'),
  });

  // NOTE: 임시로 iOS에서는 폰트 에러를 무시하고 시스템 폰트 사용
  const isIOSFontError = Platform.OS === 'ios' && fontError;
  const safelyLoaded = fontsLoaded || isIOSFontError;
  const safeFontError = Platform.OS === 'ios' ? null : fontError;

  return {
    fontsLoaded: safelyLoaded,
    fontError: safeFontError,
  };
};
