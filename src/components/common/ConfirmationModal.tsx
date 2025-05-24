import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontStyles } from '@/constants/theme';
import GroupModal from './GroupModal';

interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  confirmButtonColor = colors.danger.DEFAULT,
}) => {
  return (
    <GroupModal visible={visible} onClose={onClose} title={title}>
      <Text style={styles.message}>{message}</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={onClose}
          activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>{cancelText}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.confirmButton, { backgroundColor: confirmButtonColor }]}
          onPress={onConfirm}
          activeOpacity={0.7}>
          <Text style={styles.confirmButtonText}>{confirmText}</Text>
        </TouchableOpacity>
      </View>
    </GroupModal>
  );
};

const styles = StyleSheet.create({
  message: {
    ...fontStyles['base-normal'],
    color: colors['dark-grey-01'],
    marginBottom: spacing[6],
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors['light-grey-01'],
    borderWidth: 1,
    borderColor: colors['light-grey-02'],
  },
  confirmButton: {
    backgroundColor: colors.danger.DEFAULT,
  },
  cancelButtonText: {
    ...fontStyles['base-tight'],
    color: colors['grey-04'],
  },
  confirmButtonText: {
    ...fontStyles['base-tight'],
    color: colors.white,
  },
});

export default ConfirmationModal;
