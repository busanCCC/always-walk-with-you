import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/store/authStore';
import LoginScreen from '@/screens/LoginScreen';
import ProfileSetupScreen from '@/screens/ProfileSetupScreen';
import MyPageScreen from '@/screens/MyPageScreen';
import { Text, View, TouchableOpacity } from 'react-native';
import theme from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';

import HomeIcon from '@/assets/svg/home-icon.svg';
import DiaryCalendarIcon from '@/assets/svg/diary_calendar-icon.svg';
import SoonIcon from '@/assets/svg/soon-icon.svg';
import UserIcon from '@/assets/svg/user-icon.svg';
import HomeScreen from '@/screens/HomeScreen';
import SoonScreen from '@/screens/SoonScreen';
import WebViewScreen from '@/screens/WebViewScreen';
import HeaderLogo from '@/components/common/HeaderLogo';
import CustomHeader from '@/components/common/CustomHeader';
import { RootStackParamList } from './types';
import { AuthNavigator } from './navigators/AuthNavigator';
import { MainTabNavigator } from './navigators/MainTabNavigator';
import { LoadingScreen } from './components/LoadingScreen';
import GroupDetailScreen from '@/screens/GroupDetailScreen';
import JournalCalendarScreen from '@/screens/JournalCalendarScreen';
import JournalDetailScreen from '@/screens/JournalDetailScreen';
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
const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

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

const DiaryScreen = () => <TempScreen routeName="영성일기" />;

function AuthScreens() {
  return (
    <AuthStackNav.Navigator screenOptions={commonScreenOptions}>
      <AuthStackNav.Screen name="Login" component={LoginScreen} />
    </AuthStackNav.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: theme.colors.primary.DEFAULT,
        tabBarInactiveTintColor: theme.colors['grey-02'],
        tabBarStyle: {
          backgroundColor: theme.colors.white,
        },
        tabBarLabelStyle: {
          fontSize: theme.fontStyles['xs-normal'].fontSize,
          fontFamily: theme.fontStyles['xs-normal'].fontFamily,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let IconComponent;
          const iconSize = size * 0.9;

          if (route.name === '홈') {
            IconComponent = HomeIcon;
          } else if (route.name === '영성일기') {
            IconComponent = DiaryCalendarIcon;
          } else if (route.name === '순') {
            IconComponent = SoonIcon;
          } else if (route.name === '마이페이지') {
            IconComponent = UserIcon;
          }
          return IconComponent ? (
            <IconComponent width={iconSize} height={iconSize} fill={color} />
          ) : null;
        },
      })}>
      <Tab.Screen
        name="홈"
        component={HomeScreen}
        options={{
          headerShown: true,
          header: () => <CustomHeader headerLeft={<HeaderLogo />} noBorder={true} />,
        }}
      />
      <Tab.Screen name="영성일기" component={DiaryScreen} options={{ headerShown: false }} />
      <Tab.Screen
        name="순"
        component={SoonScreen}
        options={{
          headerShown: true,
          header: () => (
            <CustomHeader
              headerLeft={<HeaderLogo />}
              headerRight={
                <TouchableOpacity
                  style={{ padding: theme.spacing[2], marginLeft: theme.spacing[2] }}>
                  <Ionicons name="add" size={24} color={theme.colors.primary.DEFAULT} />
                </TouchableOpacity>
              }
              noBorder={true}
            />
          ),
        }}
      />
      <Tab.Screen name="마이페이지" component={MyPageScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
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
              <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
              <Stack.Screen
                name="JournalCalendar"
                component={JournalCalendarScreen}
                options={{ headerShown: false }}
              />
              <Stack.Screen
                name="JournalDetail"
                component={JournalDetailScreen}
                options={{ headerShown: false }}
              />
            </>
          ) : (
            <>
              <Stack.Screen
                name="ProfileSetup"
                component={ProfileSetupScreen}
                options={({ navigation }) => getProfileSetupScreenOptions(navigation, signOut)}
              />
            </>
          )
        ) : (
          <>
            <Stack.Screen name="Auth" component={AuthNavigator} options={commonScreenOptions} />
            <Stack.Screen name="WebView" component={WebViewScreen} options={webViewScreenOptions} />
            <Stack.Screen name="GroupDetail" component={GroupDetailScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
