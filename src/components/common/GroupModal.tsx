import React, { ReactNode, useEffect, useRef } from 'react';
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
  Animated,
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
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.8)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // 모달이 나타날 때
      Animated.parallel([
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // 모달이 사라질 때
      Animated.parallel([
        Animated.timing(backgroundOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(modalScale, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backgroundOpacity, modalScale, modalOpacity]);

  const handleBackdropPress = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal transparent={true} visible={visible} onRequestClose={onClose} animationType="none">
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              styles.centeredModal,
              {
                opacity: backgroundOpacity,
              },
            ]}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                <Animated.View
                  style={[
                    styles.modalContent,
                    {
                      opacity: modalOpacity,
                      transform: [{ scale: modalScale }],
                    },
                  ]}>
                  <Text style={styles.modalTitle}>{title}</Text>
                  <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    {children}
                  </ScrollView>
                </Animated.View>
              </TouchableWithoutFeedback>
            </TouchableWithoutFeedback>
          </Animated.View>
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
