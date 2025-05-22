import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { colors, spacing, fontStyles } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface GroupModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const GroupModal: React.FC<GroupModalProps> = ({ visible, onClose, title, children }) => {
  return (
    <Modal transparent={true} visible={visible} onRequestClose={onClose} animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.centeredModal}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{title}</Text>
              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: colors.white,
    borderRadius: spacing[3],
    padding: spacing[4],
    maxHeight: '80%',
  },
  modalTitle: {
    ...fontStyles['lg-tight'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[4],
    textAlign: 'left', // 좌측 정렬
  },
});

export default GroupModal;
