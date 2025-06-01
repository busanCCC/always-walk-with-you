import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '@/screens/HomeScreen';
import SoonScreen from '@/screens/SoonScreen';
import MyPageScreen from '@/screens/MyPageScreen';
import JournalCalendarScreen from '@/screens/JournalCalendarScreen';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import theme from '@/constants/theme';
import { MainTabParamList } from '../types';
import HomeIcon from '@/assets/svg/home-icon.svg';
import DiaryCalendarIcon from '@/assets/svg/diary_calendar-icon.svg';
import SoonIcon from '@/assets/svg/soon-icon.svg';
import UserIcon from '@/assets/svg/user-icon.svg';
import HeaderLogo from '@/components/common/HeaderLogo';
import CustomHeader from '@/components/common/CustomHeader';
import { AddGroupButton } from '../components/HeaderButtons';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: theme.colors.primary.DEFAULT,
        tabBarInactiveTintColor: theme.colors['grey-02'],
        tabBarStyle: {
          backgroundColor: theme.colors.white,
          height: Platform.OS === 'ios' ? 48 + insets.bottom : 48,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0,
          paddingTop: Platform.OS === 'ios' ? 8 : 0,
        },
        tabBarLabelStyle: {
          fontSize: theme.fontStyles['xs-normal'].fontSize,
          fontFamily: theme.fontStyles['xs-normal'].fontFamily,
          marginBottom: Platform.OS === 'ios' ? 0 : 5,
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

      <Tab.Screen
        name="영성일기"
        component={JournalCalendarScreen}
        options={{
          headerShown: true,
          header: () => <CustomHeader headerLeft={<HeaderLogo />} noBorder={true} />,
        }}
      />

      <Tab.Screen
        name="순"
        component={SoonScreen}
        options={{
          headerShown: true,
          header: () => (
            <CustomHeader
              headerLeft={<HeaderLogo />}
              headerRight={<AddGroupButton />}
              noBorder={true}
            />
          ),
        }}
      />

      <Tab.Screen name="마이페이지" component={MyPageScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
