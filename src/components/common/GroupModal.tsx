import React, { ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { colors, spacing, fontStyles } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

interface GroupModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

const GroupModal: React.FC<GroupModalProps> = ({ visible, onClose, title, children }) => {
  return (
    <Modal transparent={true} visible={visible} onRequestClose={onClose} animationType="fade">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}>
          <View style={styles.centeredModal}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>{title}</Text>
                  <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    {children}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  centeredModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[8],
  },
  modalContent: {
    width: width * 0.9,
    maxWidth: width * 0.9,
    backgroundColor: colors.white,
    borderRadius: spacing[3],
    padding: spacing[6],
    maxHeight: height * 0.7, // 화면 높이의 70%로 제한 (키보드 공간 확보)
    minHeight: 200,
  },
  modalTitle: {
    ...fontStyles['xl-tight'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[4],
    textAlign: 'left',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default GroupModal;
