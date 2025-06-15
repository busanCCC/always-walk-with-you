import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import theme from '@/constants/theme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface CustomHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  noBorder?: boolean;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  showBackButton = true,
  onBackPress,
  headerLeft,
  headerRight,
  style,
  titleStyle,
  noBorder = false,
}) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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

  const headerContentHeight = 54; // 예시: 실제 아이콘과 제목 등이 들어갈 영역의 높이

  const safeAreaTopPadding = Platform.select({
    ios: Math.max(insets.top, 20), // iOS에서 최소 20px 확보
    android: 0, // Android는 StatusBar가 별도 처리됨
    default: 0,
  });

  return (
    <View
      style={[
        styles.headerOuterContainer,
        {
          paddingTop: safeAreaTopPadding,
        },
        noBorder && styles.noBorder,
        style,
      ]}>
      <View style={[styles.headerInnerContainer, { height: headerContentHeight }]}>
        <View style={styles.leftComponent}>{renderLeft()}</View>
        <View style={styles.titleComponent}>
          {title && <Text style={[styles.titleText, titleStyle]}>{title}</Text>}
        </View>
        <View style={styles.rightComponent}>{renderRight()}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerOuterContainer: {
    width: '100%',
    backgroundColor: theme.colors.white,
    // paddingHorizontal: theme.spacing['4'], // headerInnerContainer로 이동 가능
    borderBottomColor: theme.colors['light-grey-02'],
    borderBottomWidth: 1,
    display: 'flex',
    justifyContent: 'flex-end',
  },
  headerInnerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['4'], // 좌우 패딩은 여기에 적용
    // height는 props로 전달받아 적용됨
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  leftComponent: {
    flex: 1,
    alignItems: 'flex-start',
  },
  titleComponent: {
    flex: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightComponent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: theme.spacing['2'],
  },
  titleText: {
    fontFamily: theme.fonts.semiBold,
    fontSize: 17,
    color: theme.colors['dark-grey-02'],
  },
  placeholder: {
    width: 24 + theme.spacing['2'] * 2,
  },
});

export default CustomHeader;
