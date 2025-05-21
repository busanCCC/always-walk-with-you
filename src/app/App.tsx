// NOTE - App.tsx 경로는 반드시 src/app/App.tsx 설정합니다.

import React, { useCallback, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { useAppFonts } from '@/hooks/useAppFonts';
import { useAuthStore } from '@/store/authStore';
import AppNavigator from '@/navigation/AppNavigator';
import { View, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function App() {
  const { isInitialized, initializeAuth } = useAuthStore();
  const { fontsLoaded, fontError } = useAppFonts();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && isInitialized) {
      console.log('[App.tsx] Conditions met (fonts & auth ready): Hiding SplashScreen...');
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, isInitialized]);

  const onLayoutRootView = useCallback(() => {
    console.log(
      '[App.tsx] onLayoutRootView called. Current states - fontsLoaded:',
      fontsLoaded,
      'fontError:',
      fontError,
      'isInitialized:',
      isInitialized
    );
  }, [fontsLoaded, fontError, isInitialized]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={styles.appContainer} onLayout={onLayoutRootView}>
          <AppNavigator />
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
  },
});
