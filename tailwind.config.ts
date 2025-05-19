/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2584F0',
          light: '#E1EFFE',
        },
        secondary: {
          DEFAULT: '#F6B54E',
          light: '#FFF5E4',
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
      },
      fontFamily: {
        sans: ['Pretendard', 'sans-serif'],
      },
      fontSize: {
        // Semibold 시리즈 (lineHeight: 1.5, letterSpacing: -0.011em)
        '3xl-tight': ['2rem', { lineHeight: '1.5', letterSpacing: '-0.011em' }], // 32px
        '2xl-tight': ['1.5rem', { lineHeight: '1.5', letterSpacing: '-0.011em' }], // 24px
        'xl-tight': ['1.25rem', { lineHeight: '1.5', letterSpacing: '-0.011em' }], // 20px
        'lg-tight': ['1.125rem', { lineHeight: '1.5', letterSpacing: '-0.011em' }], // 18px
        'base-tight': ['1rem', { lineHeight: '1.5', letterSpacing: '-0.011em' }], // 16px (기본)
        'sm-tight': ['0.875rem', { lineHeight: '1.5', letterSpacing: '-0.011em' }], // 14px
        'xs-tight': ['0.75rem', { lineHeight: '1.5', letterSpacing: '-0.011em' }], // 12px

        // Regular 시리즈 (lineHeight: 1.5, letterSpacing: '0em')
        'base-normal': ['1rem', { lineHeight: '1.5', letterSpacing: '0em' }], // 16px
        'sm-normal': ['0.875rem', { lineHeight: '1.5', letterSpacing: '0em' }], // 14px
        'xs-normal': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0em' }], // 12px
        '2xs-normal': ['0.625rem', { lineHeight: '1.5', letterSpacing: '0em' }], // 10px

        // Bold/16 (Extrabold) - 이 경우는 lineHeight, letterSpacing이 없으므로 기본값을 따름
        // fontSize만 정의하고, 사용할 때 font-extrabold 클래스를 함께 사용
        'base-extrabold': ['1rem', { lineHeight: 'normal', letterSpacing: 'normal'}] // 16px
      },
    },
  },
  plugins: [],
};
