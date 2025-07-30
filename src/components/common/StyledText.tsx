import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import theme, { FontStyleKeys, ColorKeys } from '@/constants/theme';

interface StyledTextProps extends RNTextProps {
  variant?: FontStyleKeys;
  color?: string;
  colorKey?: ColorKeys | string;
}

const StyledText: React.FC<StyledTextProps> = ({
  variant,
  color,
  colorKey,
  style,
  children,
  ...props
}) => {
  const textStyle: TextStyle = {};

  // 1. 기본 폰트 패밀리 설정
  textStyle.fontFamily = theme.fonts.regular; // 기본은 Pretendard-Regular

  // 2. Variant에 따른 스타일 적용
  if (variant && theme.fontStyles[variant]) {
    Object.assign(textStyle, theme.fontStyles[variant]);
  }

  // 3. Color 적용
  if (color) {
    textStyle.color = color;
  } else if (colorKey) {
    const keys = colorKey.split('.');
    let resolvedColor: any = theme.colors;
    for (const key of keys) {
      if (resolvedColor && typeof resolvedColor === 'object' && key in resolvedColor) {
        resolvedColor = resolvedColor[key];
      } else {
        resolvedColor = undefined;
        break;
      }
    }
    if (typeof resolvedColor === 'string') {
      textStyle.color = resolvedColor;
    } else {
      textStyle.color = (theme.colors as any)[colorKey] || theme.colors.black;
    }
  } else {
    textStyle.color = theme.colors.black;
  }

  const combinedStyle = StyleSheet.flatten([textStyle, style]);

  return (
    <RNText style={combinedStyle} {...props}>
      {children}
    </RNText>
  );
};

export default StyledText;
