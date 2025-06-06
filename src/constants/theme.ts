// src/constants/theme.ts

const remToPx = (remValue: string): number => {
  const rem = parseFloat(remValue);
  return rem * 16; // 기본 1rem = 16px로 가정
};

export const colors = {
  primary: {
    DEFAULT: '#2584F0',
    light: '#E1EFFE',
  },
  secondary: {
    DEFAULT: '#F6B54E',
    light: '#FFF5E4',
  },
  danger: {
    DEFAULT: '#EF4444',
    light: '#FEF2F2',
  },
  'dark-grey-01': '#3D3D3D',
  'dark-grey-02': '#242424',
  'grey-01': '#A5A5A5',
  'grey-02': '#8B8B8B',
  'grey-03': '#6F6F6F',
  'grey-04': '#555555',
  'light-grey-01': '#F4F4F4',
  'light-grey-02': '#DBDBDB',
  white: '#FFFFFF',
  black: '#000000',
  destructive: '#FF0000',
};

export const fonts = {
  thin: 'Pretendard-Thin',
  extraLight: 'Pretendard-ExtraLight',
  light: 'Pretendard-Light',
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semiBold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
  extraBold: 'Pretendard-ExtraBold',
  black: 'Pretendard-Black',
};

export const fontStyles = {
  '3xl-tight': {
    fontFamily: fonts.semiBold,
    fontSize: remToPx('2rem'), // 32
    lineHeight: remToPx('2rem') * 1.5, // 48
    letterSpacing: -0.011 * remToPx('2rem'), // -0.352
  },
  '2xl-tight': {
    fontFamily: fonts.semiBold,
    fontSize: remToPx('1.5rem'), // 24
    lineHeight: remToPx('1.5rem') * 1.5, // 36
    letterSpacing: -0.011 * remToPx('1.5rem'), // -0.264
  },
  'xl-tight': {
    fontFamily: fonts.semiBold,
    fontSize: remToPx('1.25rem'), // 20
    lineHeight: remToPx('1.25rem') * 1.5, // 30
    letterSpacing: -0.011 * remToPx('1.25rem'), // -0.22
  },
  'lg-tight': {
    fontFamily: fonts.semiBold,
    fontSize: remToPx('1.125rem'), // 18
    lineHeight: remToPx('1.125rem') * 1.5, // 27
    letterSpacing: -0.011 * remToPx('1.125rem'), // -0.198
  },
  'base-tight': {
    fontFamily: fonts.semiBold,
    fontSize: remToPx('1rem'), // 16
    lineHeight: remToPx('1rem') * 1.5, // 24
    letterSpacing: -0.011 * remToPx('1rem'), // -0.176
  },
  'sm-tight': {
    fontFamily: fonts.semiBold,
    fontSize: remToPx('0.875rem'), // 14
    lineHeight: remToPx('0.875rem') * 1.5, // 21
    letterSpacing: -0.011 * remToPx('0.875rem'), // -0.154
  },
  'xs-tight': {
    fontFamily: fonts.semiBold,
    fontSize: remToPx('0.75rem'), // 12
    lineHeight: remToPx('0.75rem') * 1.5, // 18
    letterSpacing: -0.011 * remToPx('0.75rem'), // -0.132
  },
  // Regular 시리즈
  'lg-normal': {
    fontFamily: fonts.regular,
    fontSize: remToPx('1.125rem'), // 18
    lineHeight: remToPx('1.125rem') * 1.5, // 27
    letterSpacing: 0,
  },
  'base-normal': {
    fontFamily: fonts.regular,
    fontSize: remToPx('1rem'), // 16
    lineHeight: remToPx('1rem') * 1.5, // 24
    letterSpacing: 0,
  },
  'sm-normal': {
    fontFamily: fonts.regular,
    fontSize: remToPx('0.875rem'), // 14
    lineHeight: remToPx('0.875rem') * 1.5, // 21
    letterSpacing: 0,
  },
  'xs-normal': {
    fontFamily: fonts.regular,
    fontSize: remToPx('0.75rem'), // 12
    lineHeight: remToPx('0.75rem') * 1.5, // 18
    letterSpacing: 0,
  },
  '2xs-normal': {
    fontFamily: fonts.regular,
    fontSize: remToPx('0.625rem'), // 10
    lineHeight: remToPx('0.625rem') * 1.5, // 15
    letterSpacing: 0,
  },
  'base-extrabold': {
    fontFamily: fonts.bold,
    fontSize: remToPx('1rem'),
  },
};

export const spacing = {
  px: 1,
  '0': 0,
  '0.5': 2, // 0.125rem
  '1': 4, // 0.25rem
  '1.5': 6, // 0.375rem
  '2': 8, // 0.5rem
  '2.5': 10, // 0.625rem
  '3': 12, // 0.75rem
  '3.5': 14, // 0.875rem
  '4': 16, // 1rem
  '5': 20, // 1.25rem
  '6': 24, // 1.5rem
  '8': 32, // 2rem
  '10': 40, // 2.5rem
  '12': 48, // 3rem
  '16': 64, // 4rem
  '20': 80, // 5rem
  '24': 96, // 6rem
};

export type FontStyleKeys = keyof typeof fontStyles;

type RecursiveColorKeys<T> = T extends string
  ? never
  : {
      [K in keyof T]: K extends string
        ? T[K] extends string
          ? `${K}`
          : `${K}.${RecursiveColorKeys<T[K]>}`
        : never;
    }[keyof T];

export type ColorKeys = RecursiveColorKeys<typeof colors> | keyof typeof colors;

const theme = {
  colors,
  fonts,
  fontStyles,
  spacing,
};

export default theme;
