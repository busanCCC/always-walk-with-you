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
import ActualMyPageScreen from '@/screens/MyPageScreen';
import { Text, View, TouchableOpacity } from 'react-native';
import theme from '@/constants/theme';

import HomeIcon from '@/assets/svg/home-icon.svg';
import DiaryCalendarIcon from '@/assets/svg/diary_calendar-icon.svg';
import SoonIcon from '@/assets/svg/soon-icon.svg';
import UserIcon from '@/assets/svg/user-icon.svg';

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

export type RootStackParamList = {
  Auth: undefined; // AuthStack을 의미
  Main: undefined; // MainTabs를 의미
  ProfileSetup: undefined; // ProfileSetupScreen 추가
  Loading: undefined; // 로딩 스크린 (선택 사항)
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStackNav = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const commonScreenOptions: NativeStackNavigationOptions = {
  headerShown: false,
};

// ProfileSetupScreen 헤더 옵션 - 이제 CustomHeader를 사용하므로 headerShown: false로 변경
const getProfileSetupScreenOptions = (
  navigation: any,
  signOut: () => void
): NativeStackNavigationOptions => ({
  headerShown: false,
});

// 임시 스크린
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

// 각 탭에 대한 실제 스크린 컴포넌트 (또는 TempScreen 사용)
const HomeScreen = () => <TempScreen routeName="홈" />;
const DiaryScreen = () => <TempScreen routeName="영성일기" />;
const SoonListScreen = () => <TempScreen routeName="순" />;
const MyPageScreen = () => <TempScreen routeName="마이페이지" />;

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
        headerShown: false,
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
          const iconSize = size * 0.9; // 아이콘 크기 조정

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
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="영성일기" component={DiaryScreen} />
      <Tab.Screen name="순" component={SoonListScreen} />
      <Tab.Screen name="마이페이지" component={ActualMyPageScreen} />
    </Tab.Navigator>
  );
}

function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.white,
      }}>
      <Text
        style={{
          fontFamily: theme.fonts.regular,
          fontSize: 18,
          color: theme.colors.primary.DEFAULT,
        }}>
        로딩 중...
      </Text>
    </View>
  );
}

export default function AppNavigator() {
  const { session, loading, isInitialized, profileCompleted, signOut } = useAuthStore();

  console.log(
    '[AppNavigator] States: loading:',
    loading,
    'isInitialized:',
    isInitialized,
    'session:',
    !!session,
    'profileCompleted:',
    profileCompleted
  );

  if (loading || !isInitialized) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={commonScreenOptions}>
        {session ? (
          profileCompleted ? (
            <Stack.Screen name="Main" component={MainTabs} />
          ) : (
            <Stack.Screen
              name="ProfileSetup"
              component={ProfileSetupScreen}
              options={({ navigation }) => getProfileSetupScreenOptions(navigation, signOut)}
            />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthScreens} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
