// NOTE - App.tsx 경로는 반드시 src/app/App.tsx 설정합니다.

import React, { useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Text, View, Button } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAppFonts } from '@/hooks/useAppFonts';
import '@/app/global.css';
import StyledText from '@/components/common/StyledText';

SplashScreen.preventAutoHideAsync();

function HomeScreen({ navigation }: any) {
  return (
    <View className="flex-1 items-center justify-center bg-white font-sans">
      <StyledText className="mb-4 font-sans text-xl">Home Screen</StyledText>
      <Button title="Go to Details" onPress={() => navigation.navigate('Details')} />
      <StatusBar style="auto" />
    </View>
  );
}

function DetailsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl">Details Screen</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  const { fontsLoaded, fontError } = useAppFonts();

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={{ flex: 1 }} onLayout={onLayoutRootView} className="font-sans">
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Home">
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: '홈' }} />
          <Stack.Screen name="Details" component={DetailsScreen} options={{ title: '상세 정보' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
