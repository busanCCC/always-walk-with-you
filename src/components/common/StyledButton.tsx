import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import theme from '@/constants/theme';

interface StyledButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'secondary'; // 버튼 종류 추가 가능
}

const StyledButton: React.FC<StyledButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
  variant = 'primary',
}) => {
  const buttonStyles = [
    styles.button,
    variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
    (disabled || loading) && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText,
    textStyle,
  ];

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} style={buttonStyles}>
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? theme.colors.white : theme.colors.primary.DEFAULT}
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    flexDirection: 'row', // 로딩 아이콘과 텍스트를 위해
  },
  primaryButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  secondaryButton: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.primary.DEFAULT, // primary 기준, secondary는 다르게 처리 가능
    opacity: 0.5,
  },
  buttonText: {
    fontFamily: theme.fonts.regular,
    fontWeight: '600',
    fontSize: 16,
  },
  primaryButtonText: {
    color: theme.colors.white,
  },
  secondaryButtonText: {
    color: theme.colors.primary.DEFAULT,
  },
});

export default StyledButton;
