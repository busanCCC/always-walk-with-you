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
import AlertModal from '@/components/common/AlertModal';
import { Emotion } from '@/types/journal';

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
  questions?: any[];

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
  const scrollViewRef = useRef<ScrollView>(null);

  // 키보드 높이 추적
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardHeightAnimated = useRef(new Animated.Value(0)).current;

  // 알림 모달 상태
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');

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

    // 질문 기반 모드에서 모든 질문에 답변했는지 확인
    if (mode === 'prompt_based') {
      const unansweredCount = promptAnswers.filter(
        (answer) => !answer.answer || answer.answer.trim().length === 0
      ).length;

      if (unansweredCount > 0) {
        setValidationMessage(
          `아직 답하지 않은 질문이 ${unansweredCount}개 있습니다.\n모든 질문에 답을 작성해주세요.`
        );
        setShowValidationModal(true);
        return;
      }
    }

    // 자유 작성 모드에서 내용이 있는지 확인
    if (mode === 'free_writing') {
      if (!freeWriteContent || freeWriteContent.trim().length === 0) {
        setValidationMessage('일기 내용을 입력해주세요.');
        setShowValidationModal(true);
        return;
      }
    }

    // 모든 validation 통과하면 저장
    onSave();
  };

  const renderFreeWriteContent = () => {
    // 키보드 높이에 따른 하단 여백 계산
    const keyboardPadding = keyboardHeight > 0 ? keyboardHeight + 20 : 100;

    return (
      <View style={[styles.contentContainer, { paddingBottom: keyboardPadding }]}>
        <TextInput
          style={styles.freeWriteInput}
          placeholder={freeWritePlaceholder}
          placeholderTextColor={colors['light-grey-02']}
          value={freeWriteContent}
          onChangeText={onFreeWriteContentChange}
          multiline
          textAlignVertical="top"
          editable={!disabled}
          returnKeyType="default"
          blurOnSubmit={false}
          enablesReturnKeyAutomatically={false}
        />
      </View>
    );
  };

  const renderPromptBasedContent = () => {
    // 키보드 높이에 따른 하단 여백 계산
    const keyboardPadding = keyboardHeight > 0 ? keyboardHeight + 20 : 100;

    return (
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContentContainer,
          {
            paddingBottom: keyboardPadding, // 키보드 높이만큼 하단 여백 추가
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        scrollEventThrottle={16}
        // onTouchStart 제거 - 불필요한 키보드 숨김 방지
      >
        {promptAnswers.map((answer, index) => {
          const question =
            questions.find((q) => q.order_index === answer.order) || questions[index];
          return (
            <View key={answer.order || index} style={styles.questionContainer}>
              <View style={styles.questionTextContainer}>
                <Text style={styles.questionText}>
                  {question?.content || answer.question_text || `질문 ${index + 1}`}
                </Text>
              </View>
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
                  scrollEnabled={false}
                  returnKeyType="default"
                  blurOnSubmit={false}
                  enablesReturnKeyAutomatically={false}
                  onFocus={() => {
                    // TextInput 포커스 시 해당 위치로 자동 스크롤
                    setTimeout(
                      () => {
                        if (scrollViewRef.current) {
                          // 질문별 예상 높이 (질문 텍스트 + 입력창 + 여백)
                          const questionHeight = 140;

                          // 현재 질문의 대략적인 Y 위치 계산
                          const questionY = index * questionHeight;

                          // 키보드 높이 고려한 스크롤 오프셋
                          const keyboardOffset = keyboardHeight > 0 ? keyboardHeight + 100 : 250;

                          // 마지막 질문들은 더 많이 스크롤
                          const isLastQuestions = index >= promptAnswers.length - 2;
                          const additionalScroll = isLastQuestions ? 200 : 100;

                          const scrollToY = Math.max(0, questionY - additionalScroll);

                          scrollViewRef.current.scrollTo({
                            y: scrollToY,
                            animated: true,
                          });
                        }
                      },
                      Platform.OS === 'ios' ? 300 : 150
                    ); // iOS 키보드 애니메이션 고려
                  }}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {/* Journal Header - 날짜, 요일, 감정 아이콘 */}
        <View style={styles.headerContainer}>
          <JournalHeader
            date={date}
            isWriteMode={true}
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

      {/* Validation Modal */}
      <AlertModal
        visible={showValidationModal}
        title="입력 확인"
        message={validationMessage}
        confirmText="확인"
        onClose={() => setShowValidationModal(false)}
      />
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
    backgroundColor: colors.white,
  },
  scrollContentContainer: {
    flexGrow: 1,
    padding: spacing[4],
    paddingBottom: 120, // footer 높이 + 여백 줄임
  },
  questionContainer: {
    marginBottom: spacing[6],
  },
  questionTextContainer: {
    marginBottom: spacing[3],
  },
  questionText: {
    ...fontStyles['base-tight'],
    color: colors.black,
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
