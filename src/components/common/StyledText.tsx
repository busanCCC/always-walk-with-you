import React from 'react';
import { Text as RNText, TextProps as RNTextProps } from 'react-native';

interface StyledTextProps extends RNTextProps {
  // 여기에 커스텀 Text 컴포넌트를 위한 추가적인 props를 정의할 수 있습니다.
  // 예를 들어, 특정 폰트 두께를 위한 prop을 추가할 수도 있습니다.
  // weight?: 'Regular' | 'Medium' | 'SemiBold' | 'Bold' | 'ExtraBold';
}

const StyledText: React.FC<StyledTextProps> = ({ className, style, children, ...props }) => {
  // 기본적으로 font-sans 클래스를 적용합니다.
  // NativeWind v4에서는 className prop을 직접 사용합니다.
  const defaultClassName = 'font-sans'; // tailwind.config.ts의 sans에 Pretendard가 매핑되어 있어야 함

  // 외부에서 전달된 className과 기본 className을 조합합니다.
  // style prop도 함께 고려하여 병합합니다.
  const combinedClassName = `${defaultClassName} ${className || ''}`.trim();

  return (
    <RNText className={combinedClassName} style={style} {...props}>
      {children}
    </RNText>
  );
};

export default StyledText;
