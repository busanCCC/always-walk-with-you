import React from 'react';
import { View, Text } from 'react-native';
import theme from '@/constants/theme';

export function LoadingScreen() {
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
