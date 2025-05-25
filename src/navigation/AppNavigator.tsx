import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/authStore';
import ProfileSetupScreen from '@/screens/ProfileSetupScreen';
import { Text, View, TouchableOpacity } from 'react-native';
import theme from '@/constants/theme';
import WebViewScreen from '@/screens/WebViewScreen';
import { RootStackParamList } from './types';
import { AuthNavigator } from './navigators/AuthNavigator';
import { MainTabNavigator } from './navigators/MainTabNavigator';
import { LoadingScreen } from './components/LoadingScreen';
import GroupDetailScreen from '@/screens/GroupDetailScreen';
import JournalCalendarScreen from '@/screens/JournalCalendarScreen';
import JournalDetailScreen from '@/screens/JournalDetailScreen';
import SelectJournalModeScreen from '@/screens/SelectJournalModeScreen';
import CreateJournalScreen from '@/screens/CreateJournalScreen';
import EditJournalScreen from '@/screens/EditJournalScreen';

// 스크린 타입 정의
export type AuthStackParamList = {
  Login: undefined;
};

export type MainTabParamList = {
  홈: undefined;
  영성일기: undefined;
  순: undefined;
  마이페이지: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const commonScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

const getProfileSetupScreenOptions = (
  navigation: any,
  signOut: () => void
): NativeStackNavigationOptions => ({
  headerShown: false,
});

const webViewScreenOptions = ({ route }: any): NativeStackNavigationOptions => ({
  headerShown: true,
  title: route.params?.title || '웹뷰',
  headerTitleStyle: {
    fontFamily: theme.fonts.semiBold,
  },
});

function TempScreen({ routeName }: { routeName: string }) {
  const signOut = useAuthStore((state) => state.signOut);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontFamily: theme.fonts.regular }}>{routeName} Screen</Text>
      {routeName === '마이페이지' && (
        <TouchableOpacity
          onPress={signOut}
          style={{
            marginTop: 20,
            padding: 10,
            backgroundColor: theme.colors.primary.DEFAULT,
            borderRadius: 5,
          }}>
          <Text style={{ color: theme.colors.white }}>로그아웃</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function AppNavigator() {
  const { session, loading, isInitialized, profileCompleted, signOut } = useAuthStore();

  if (loading || !isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={session ? (profileCompleted ? 'Main' : 'ProfileSetup') : 'Auth'}>
        {session ? (
          profileCompleted ? (
            <>
              <Stack.Screen
                name="Main"
                component={MainTabNavigator}
                options={commonScreenOptions}
              />
              <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
              <Stack.Screen
                name="JournalCalendar"
                component={JournalCalendarScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="JournalDetail"
                component={JournalDetailScreen}
                options={{ headerShown: true }}
              />
              <Stack.Screen
                name="SelectJournalMode"
                component={SelectJournalModeScreen}
                options={{
                  headerShown: true,
                }}
              />
              <Stack.Screen
                name="CreateJournalFreeWrite"
                component={CreateJournalScreen}
                options={{ headerShown: true }}
              />
              <Stack.Screen
                name="CreateJournalPrompt"
                component={CreateJournalScreen}
                options={{ headerShown: true }}
              />
              <Stack.Screen
                name="EditJournal"
                component={EditJournalScreen}
                options={{ headerShown: true }}
              />
              <Stack.Screen
                name="ProfileSetup"
                component={ProfileSetupScreen}
                options={({ navigation }) => getProfileSetupScreenOptions(navigation, signOut)}
              />
              <Stack.Screen
                name="WebView"
                component={WebViewScreen}
                options={webViewScreenOptions}
              />
            </>
          ) : (
            <Stack.Screen
              name="ProfileSetup"
              component={ProfileSetupScreen}
              options={({ navigation }) => getProfileSetupScreenOptions(navigation, signOut)}
            />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} options={commonScreenOptions} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
