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
    </View>
  );
}
