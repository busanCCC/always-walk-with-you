import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, fontStyles } from '@/constants/theme';
import GroupModal from './GroupModal';

interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  onClose,
  title,
  message,
  confirmText = '확인',
}) => {
  return (
    <GroupModal visible={visible} onClose={onClose} title={title}>
      <Text style={styles.message}>{message}</Text>

      <TouchableOpacity style={styles.confirmButton} onPress={onClose} activeOpacity={0.7}>
        <Text style={styles.confirmButtonText}>{confirmText}</Text>
      </TouchableOpacity>
    </GroupModal>
  );
};

const styles = StyleSheet.create({
  message: {
    ...fontStyles['base-normal'],
    color: colors['dark-grey-01'],

    marginBottom: spacing[6],
    textAlign: 'left',
  },
  confirmButton: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.primary.DEFAULT,
  },
  confirmButtonText: {
    ...fontStyles['base-tight'],
    color: colors.white,
  },
});

export default AlertModal;
