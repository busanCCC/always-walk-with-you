import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { colors, spacing, fontStyles } from '@/constants/theme';
import JournalHeader from '@/components/common/JournalHeader';
import EmotionBottomSheet, { EmotionBottomSheetRef } from '@/components/common/EmotionBottomSheet';
import GroupShareBottomSheet, {
  GroupShareBottomSheetRef,
} from '@/components/common/GroupShareBottomSheet';
import { Emotion, Question } from '@/types/journal';

interface QuestionAnswer {
  question_id?: string;
  question_text?: string;
  answer: string;
  placeholder?: string;
  order: number;
}

interface JournalEditorFormProps {
  // 공통 데이터
  date: Date;
  selectedEmotion: Emotion | null;
  mode: 'free_writing' | 'prompt_based' | 'handwriting_upload';

  // 자유 작성 모드
  freeWriteContent?: string;
  onFreeWriteContentChange?: (content: string) => void;
  freeWritePlaceholder?: string;

  // 질문 기반 모드
  promptAnswers?: QuestionAnswer[];
  onPromptAnswerChange?: (order: number, text: string) => void;
  questions?: Question[];

  // 감정 선택
  onSelectEmotion: (emotion: Emotion) => void;
  defaultEmotion?: Emotion;

  // Footer 액션
  onSave: () => void;
  isSaving?: boolean;
  saveButtonText?: string;

  // 순 공유 (생성 모드에서만 사용)
  showGroupShare?: boolean;
  selectedGroupIds?: string[];
  onShareToGroup?: () => void;
  onSelectGroups?: (groupIds: string[]) => void;

  // 기타
  disabled?: boolean;
  leftFooterContent?: React.ReactNode;
}

const JournalEditorForm: React.FC<JournalEditorFormProps> = ({
  date,
  selectedEmotion,
  mode,
  freeWriteContent = '',
  onFreeWriteContentChange,
  freeWritePlaceholder = '오늘 하나님과 나눌 이야기를 기록해볼까요?',
  promptAnswers = [],
  onPromptAnswerChange,
  questions = [],

  onSelectEmotion,
  defaultEmotion,
  onSave,
  isSaving = false,
  saveButtonText,
  showGroupShare = false,
  selectedGroupIds = [],
  onShareToGroup,
  onSelectGroups,
  disabled = false,
  leftFooterContent,
}) => {
  const insets = useSafeAreaInsets();
  const emotionBottomSheetRef = useRef<EmotionBottomSheetRef>(null);
  const groupShareBottomSheetRef = useRef<GroupShareBottomSheetRef>(null);

  // 키보드 높이 추적
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightAnimated = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => {
        const { height } = event.endCoordinates;
        setKeyboardHeight(height);
        Animated.timing(keyboardHeightAnimated, {
          toValue: height,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: false,
        }).start();
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        Animated.timing(keyboardHeightAnimated, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? 250 : 200,
          useNativeDriver: false,
        }).start();
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, [keyboardHeightAnimated]);

  const handleEmotionPress = () => {
    Keyboard.dismiss(); // bottom sheet 열기 전에 키보드 내리기
    emotionBottomSheetRef.current?.present();
  };

  const handleShareToGroup = () => {
    Keyboard.dismiss(); // bottom sheet 열기 전에 키보드 내리기
    groupShareBottomSheetRef.current?.present();
  };

  const handleSave = () => {
    Keyboard.dismiss(); // 저장 시 키보드 내리기
    onSave();
  };

  const renderFreeWriteContent = () => (
    <View style={styles.contentContainer}>
      <TextInput
        style={styles.freeWriteInput}
        placeholder={freeWritePlaceholder}
        placeholderTextColor={colors['light-grey-02']}
        value={freeWriteContent}
        onChangeText={onFreeWriteContentChange}
        multiline
        textAlignVertical="top"
        editable={!disabled}
        returnKeyType="done"
        blurOnSubmit={true}
      />
    </View>
  );

  const renderPromptBasedContent = () => (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={styles.scrollContentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {promptAnswers.map((answer, index) => {
        const question = questions.find((q) => q.order_index === answer.order) || questions[index];
        return (
          <View key={answer.order || index} style={styles.questionContainer}>
            <Text style={styles.questionText}>
              {question?.content || answer.question_text || `질문 ${index + 1}`}
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={answer.placeholder || '답변을 입력해주세요...'}
                placeholderTextColor={colors['light-grey-02']}
                value={answer.answer}
                onChangeText={(text) => onPromptAnswerChange?.(answer.order, text)}
                multiline
                textAlignVertical="top"
                editable={!disabled}
              />
            </View>
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          {/* Journal Header - 날짜, 요일, 감정 아이콘 */}
          <View style={styles.headerContainer}>
            <JournalHeader
              date={date}
              emotion={selectedEmotion || defaultEmotion}
              onEmotionPress={handleEmotionPress}
              defaultEmotion={defaultEmotion}
            />
          </View>

          {/* 구분선 */}
          <View style={styles.divider} />

          {/* 내용 입력 영역 */}
          <View style={styles.contentWrapper}>
            {mode === 'free_writing' ? renderFreeWriteContent() : renderPromptBasedContent()}
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>

      {/* Footer - 키보드 위에 고정되는 버튼들 */}
      <Animated.View
        style={[
          styles.footer,
          {
            paddingBottom:
              keyboardHeight > 0
                ? spacing[2] // 키보드가 올라왔을 때는 최소 패딩만
                : spacing[2] + (Platform.OS === 'ios' ? insets.bottom : 0), // 키보드가 없을 때만 safe area 적용
            transform: [
              {
                translateY: keyboardHeightAnimated.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -1],
                }),
              },
            ],
          },
        ]}>
        <View style={styles.footerContent}>
          {/* 왼쪽 영역 */}
          <View style={styles.leftFooter}>
            {showGroupShare ? (
              <TouchableOpacity
                style={styles.shareButton}
                onPress={handleShareToGroup}
                disabled={disabled}>
                <View style={styles.shareIcon}>
                  <Ionicons
                    name="share-outline"
                    size={16}
                    color={disabled ? colors['light-grey-02'] : colors.primary.DEFAULT}
                  />
                </View>
                <Text style={[styles.shareButtonText, disabled && styles.disabledText]}>
                  순에 공유하기({selectedGroupIds.length})
                </Text>
              </TouchableOpacity>
            ) : (
              leftFooterContent
            )}
          </View>

          {/* 저장하기 버튼 */}
          <TouchableOpacity
            style={[styles.saveButton, (disabled || isSaving) && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={disabled || isSaving}>
            <Text style={styles.saveButtonText}>
              {isSaving ? '저장 중...' : saveButtonText || '저장하기'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors['dark-grey-02']} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* 감정 선택 BottomSheet */}
      <EmotionBottomSheet
        ref={emotionBottomSheetRef}
        onSelectEmotion={onSelectEmotion}
        selectedEmotion={selectedEmotion || defaultEmotion}
      />

      {/* 순 공유 BottomSheet */}
      {showGroupShare && (
        <GroupShareBottomSheet
          ref={groupShareBottomSheetRef}
          onSelectGroups={onSelectGroups || (() => {})}
          initialSelectedGroups={selectedGroupIds}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  keyboardContainer: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: spacing[4],
  },
  divider: {
    height: 1,
    backgroundColor: colors['light-grey-02'],
  },
  contentWrapper: {
    flex: 1,
  },
  // 자유 작성 모드 스타일
  contentContainer: {
    flex: 1,
    padding: spacing[4],
    paddingBottom: 80, // footer 높이 + 여백
  },
  freeWriteInput: {
    flex: 1,
    ...fontStyles['base-normal'],
    color: colors['dark-grey-02'],
    textAlignVertical: 'top',
  },
  // 질문 기반 모드 스타일
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: spacing[4],
    paddingBottom: 180, // footer 높이 + 여백
  },
  questionContainer: {
    marginBottom: spacing[6],
  },
  questionText: {
    ...fontStyles['base-tight'],
    color: colors.black,
    marginBottom: spacing[3],
    lineHeight: 24,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.primary.DEFAULT,
    borderRadius: 16,
    backgroundColor: colors.white,
  },
  textInput: {
    ...fontStyles['base-normal'],
    color: colors['dark-grey-02'],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 100,
    textAlignVertical: 'top',
  },
  // Footer 스타일 - 절대 위치로 키보드 위에 고정
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors['light-grey-02'],
    justifyContent: 'center',
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    paddingTop: spacing[3],
  },
  leftFooter: {
    flex: 1,
    maxWidth: '50%',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  shareIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[0.5],
  },
  shareButtonText: {
    ...fontStyles['sm-normal'],
    color: colors.primary.DEFAULT,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing[4],
  },
  saveButtonText: {
    ...fontStyles['sm-normal'],
    color: colors['dark-grey-02'],
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  disabledText: {
    color: colors['light-grey-02'],
  },
});

export default JournalEditorForm;
