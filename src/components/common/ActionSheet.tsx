import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, fontStyles } from '@/constants/theme';

interface ActionSheetOption {
  label: string;
  icon: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  options: ActionSheetOption[];
  title?: string;
}

const ActionSheet: React.FC<ActionSheetProps> = ({ visible, onClose, options, title }) => {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {title && (
                <View style={styles.titleContainer}>
                  <Text style={styles.titleText}>{title}</Text>
                </View>
              )}

              <View style={styles.optionsContainer}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.optionButton, index === options.length - 1 && styles.lastOption]}
                    onPress={() => {
                      option.onPress();
                      onClose();
                    }}>
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={option.destructive ? colors.danger.DEFAULT : colors['grey-02']}
                    />
                    <Text style={[styles.optionText, option.destructive && styles.destructiveText]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>취소</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.white,
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    borderRadius: 12,
  },
  titleContainer: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors['light-grey-02'],
  },
  titleText: {
    ...fontStyles['base-tight'],
    color: colors['grey-03'],
    textAlign: 'center',
  },
  optionsContainer: {
    paddingVertical: spacing[2],
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors['light-grey-02'],
  },
  lastOption: {
    borderBottomWidth: 0,
  },
  optionText: {
    ...fontStyles['base-normal'],
    color: colors['dark-grey-02'],
    marginLeft: spacing[3],
    flex: 1,
  },
  destructiveText: {
    color: colors.danger.DEFAULT,
  },
  cancelButton: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors['light-grey-02'],
  },
  cancelText: {
    ...fontStyles['base-normal'],
    color: colors['grey-02'],
    textAlign: 'center',
  },
});

export default ActionSheet;
