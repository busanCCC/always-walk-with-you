import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import theme from '@/constants/theme';
import PlusIcon from '@/assets/svg/plus.svg';
import { useNavigation } from '@react-navigation/native';

interface HeaderButtonProps {
  onPress?: () => void;
}

export const AddGroupButton: React.FC<HeaderButtonProps> = ({ onPress }) => {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // AddGroupModal을 열기 위해 화면 파라미터에 모달 표시 상태 전달
      // @ts-ignore - 타입 정의는 나중에 개선
      navigation.setParams({ showAddGroupModal: true });
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.headerButton}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <PlusIcon width={16} height={16} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  headerButton: {
    paddingVertical: theme.spacing[2],
  },
});
