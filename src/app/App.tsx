// NOTE - App.tsx 경로는 반드시 src/app/App.tsx 설정합니다.

import React, { useCallback, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import { useAppFonts } from '@/hooks/useAppFonts';
import { useAuthStore } from '@/store/authStore';
import AppNavigator from '@/navigation/AppNavigator';
import { View, StyleSheet, Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { initializeGoogleSignIn } from '@/apis/authApi';

SplashScreen.preventAutoHideAsync();

// iOS에서 WebBrowser 최적화 설정
if (Platform.OS === 'ios') {
  WebBrowser.maybeCompleteAuthSession();
}

const queryClient = new QueryClient();

export default function App() {
  const { isInitialized, initializeAuth } = useAuthStore();
  const { fontsLoaded, fontError } = useAppFonts();

  useEffect(() => {
    initializeAuth();
    initializeGoogleSignIn();
  }, [initializeAuth]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && isInitialized) {
      console.log('[App.tsx] Conditions met (fonts & auth ready): Hiding SplashScreen...');
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isInitialized]);

  const onLayoutRootView = useCallback(() => {
    console.log('[App.tsx] onLayoutRootView called. Current states - fontsLoaded:', fontsLoaded);
  }, [fontsLoaded, fontError, isInitialized]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar backgroundColor="#ffffff" translucent={false} />
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <View style={styles.appContainer} onLayout={onLayoutRootView}>
              <AppNavigator />
            </View>
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
});
