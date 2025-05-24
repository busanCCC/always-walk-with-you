import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import theme, { spacing } from '@/constants/theme';

export function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing[2],
        backgroundColor: theme.colors.white,
      }}>
      <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      <Text
        style={{
          fontFamily: theme.fonts.regular,
          fontSize: 18,
          color: theme.colors.primary.DEFAULT,
        }}>
        데이터를 불러오는 중...
      </Text>
    </View>
  );
}
