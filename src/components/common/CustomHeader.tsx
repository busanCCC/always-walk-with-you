import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons'; // 아이콘 사용
import theme from '@/constants/theme';

interface CustomHeaderProps {
  title?: string; // 중앙 제목
  showBackButton?: boolean; // 뒤로가기 버튼 표시 여부
  onBackPress?: () => void; // 뒤로가기 버튼 커스텀 핸들러
  headerLeft?: React.ReactNode; // 왼쪽 커스텀 컴포넌트 (뒤로가기 버튼보다 우선)
  headerRight?: React.ReactNode; // 오른쪽 커스텀 컴포넌트
  style?: ViewStyle; // 헤더 전체 스타일 오버라이드
  titleStyle?: TextStyle; // 제목 스타일 오버라이드
  noBorder?: boolean; // 하단 테두리 제거 여부
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  showBackButton = true, // 기본적으로 뒤로가기 버튼 표시
  onBackPress,
  headerLeft,
  headerRight,
  style,
  titleStyle,
  noBorder = false,
}) => {
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const renderLeft = () => {
    if (headerLeft) {
      return headerLeft;
    }
    if (showBackButton) {
      return (
        <TouchableOpacity onPress={handleBackPress} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors['dark-grey-02']} />
        </TouchableOpacity>
      );
    }
    return <View style={styles.placeholder} />; // 공간 차지 (정렬 위함)
  };

  const renderRight = () => {
    if (headerRight) {
      return headerRight;
    }
    return <View style={styles.placeholder} />; // 공간 차지 (정렬 위함)
  };

  return (
    <View style={[styles.headerContainer, noBorder && styles.noBorder, style]}>
      <View style={styles.leftComponent}>{renderLeft()}</View>
      <View style={styles.titleComponent}>
        {title && <Text style={[styles.titleText, titleStyle]}>{title}</Text>}
      </View>
      <View style={styles.rightComponent}>{renderRight()}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 56, // 일반적인 헤더 높이
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['2'], // 좌우 기본 패딩
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors['light-grey-02'],
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  leftComponent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  titleComponent: {
    flex: 3, // 제목이 중앙에 오도록 비율 조정
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightComponent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: theme.spacing['2'], // 터치 영역 확보
  },
  titleText: {
    fontFamily: theme.fonts.semiBold, // Pretendard-SemiBold
    fontSize: 17, // 일반적인 헤더 타이틀 크기
    color: theme.colors['dark-grey-02'],
  },
  placeholder: {
    width: 24 + theme.spacing['2'] * 2, // 아이콘 버튼과 유사한 너비 (아이콘 크기 + 양쪽 패딩)
  },
});

export default CustomHeader;
