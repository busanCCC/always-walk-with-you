import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '@/screens/HomeScreen';
import SoonScreen from '@/screens/SoonScreen';
import MyPageScreen from '@/screens/MyPageScreen';
import JournalCalendarScreen from '@/screens/JournalCalendarScreen';
import { View, Text, TouchableOpacity } from 'react-native';
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

// 임시 화면 컴포넌트
// function TempScreen({ routeName }: { routeName: string }) {
//   return (
//     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
//       <Text style={{ fontFamily: theme.fonts.regular }}>{routeName} Screen</Text>
//     </View>
//   );
// }
// const DiaryScreen = () => <TempScreen routeName="영성일기" />;

export function MainTabNavigator() {
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
