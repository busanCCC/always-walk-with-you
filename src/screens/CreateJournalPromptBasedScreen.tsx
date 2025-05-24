import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '@/components/common/CustomHeader';
import JournalHeader from '@/components/common/JournalHeader';
import EmotionBottomSheet, { EmotionBottomSheetRef } from '@/components/common/EmotionBottomSheet';
import GroupShareBottomSheet, {
  GroupShareBottomSheetRef,
} from '@/components/common/GroupShareBottomSheet';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import AlertModal from '@/components/common/AlertModal';
import { colors, spacing, fontStyles } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Emotion, Question } from '@/types/journal';
import {
  useEmotionsQuery,
  useQuestionsQuery,
  useCreateJournalMutation,
} from '@/queries/journalQueries';
import { useAuthStore } from '@/store/authStore';
import { RootStackParamList } from '@/navigation/types';
import { getTodayString } from '@/utils/journalUtils';
import Toast from 'react-native-toast-message';

interface QuestionAnswer {
  question_id: string;
  question_text: string;
  answer: string;
  placeholder: string;
  order: number;
}

type CreateJournalPromptRouteProp = NativeStackScreenProps<
  RootStackParamList,
  'CreateJournalPrompt'
>['route'];

const CreateJournalPromptBasedScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CreateJournalPromptRouteProp>();
  const selectedDate = route.params?.selectedDate;

  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isForceExit, setIsForceExit] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });
  const emotionBottomSheetRef = useRef<EmotionBottomSheetRef>(null);
  const groupShareBottomSheetRef = useRef<GroupShareBottomSheetRef>(null);
  const insets = useSafeAreaInsets();

  // 데이터 가져오기
  const { data: emotions = [] } = useEmotionsQuery();
  const { data: questions = [] } = useQuestionsQuery();

  // 저널 생성 mutation
  const createJournalMutation = useCreateJournalMutation();

  // 사용자 정보
  const userId = useAuthStore((state) => state.session?.user?.id);

  // 기본 행복 감정 찾기
  const defaultEmotion = emotions.find((emotion) => emotion.name === '행복') || emotions[0];

  // 선택된 날짜 또는 오늘 날짜 (현지 시간 기준으로 정확히 변환)
  const journalDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00') // 현지 시간 기준으로 자정 설정
    : new Date(getTodayString() + 'T00:00:00'); // 오늘 날짜도 현지 시간 기준으로

  // 답변이 있는지 확인하는 함수
  const hasAnyAnswer = () => {
    return answers.some((answer) => answer.answer.trim() !== '');
  };

  // 뒤로가기 방지
  useFocusEffect(
    useCallback(() => {
      const subscription = navigation.addListener('beforeRemove', (e) => {
        if (!hasAnyAnswer() || isForceExit || createJournalMutation.isPending) {
          return; // 답변이 없거나 강제 나가기 또는 저장 중이면 그냥 나가기
        }

        e.preventDefault();
        setShowExitModal(true);
      });

      return subscription;
    }, [navigation, answers, isForceExit, createJournalMutation.isPending])
  );

  // 질문들이 로드되면 초기 답변 상태 설정
  React.useEffect(() => {
    if (questions.length > 0 && answers.length === 0) {
      const initialAnswers: QuestionAnswer[] = questions.map((question) => ({
        question_id: question.id,
        question_text: question.content,
        answer: '',
        placeholder: question.placeholder || '',
        order: question.order_index,
      }));
      setAnswers(initialAnswers);
    }
  }, [questions, answers.length]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          headerLeft={
            <TouchableOpacity
              onPress={() => {
                if (hasAnyAnswer() && !createJournalMutation.isPending) {
                  setShowExitModal(true);
                } else {
                  navigation.goBack();
                }
              }}
              style={styles.headerButton}>
              <Ionicons name="chevron-back" size={20} color={colors['dark-grey-02']} />
            </TouchableOpacity>
          }
          noBorder
        />
      ),
    });
  }, [navigation, answers]);

  const handleExitConfirm = () => {
    setShowExitModal(false);
    setIsForceExit(true);
    // 다음 프레임에서 나가기 실행
    setTimeout(() => {
      navigation.goBack();
    }, 0);
  };

  const handleAnswerChange = (questionId: string, text: string) => {
    setAnswers((prev) =>
      prev.map((item) => (item.question_id === questionId ? { ...item, answer: text } : item))
    );
  };

  const showAlert = (title: string, message: string) => {
    setAlertModal({ visible: true, title, message });
  };

  const hideAlert = () => {
    setAlertModal({ visible: false, title: '', message: '' });
  };

  const handleSaveJournal = async () => {
    if (!userId) {
      showAlert('오류', '로그인이 필요합니다.');
      return;
    }

    const filledAnswers = answers.filter((item) => item.answer.trim() !== '');
    if (filledAnswers.length === 0) {
      showAlert('내용 입력', '최소 하나 이상의 질문에 답변해주세요.');
      return;
    }

    const emotionToSave = selectedEmotion || defaultEmotion;
    if (!emotionToSave) {
      showAlert('오류', '감정을 선택해주세요.');
      return;
    }

    try {
      // 선택된 날짜가 있으면 그 날짜로, 없으면 오늘 날짜로 (현지 시간 기준)
      const dateString = selectedDate || getTodayString();

      const answersData = filledAnswers.map((item) => ({
        answer: item.answer.trim(),
        order: item.order,
      }));

      await createJournalMutation.mutateAsync({
        user_id: userId,
        date: dateString,
        mode: 'prompt_based',
        emotion_id: emotionToSave.id,
        answers: answersData,
        shared_groups: selectedGroupIds,
      });

      Toast.show({
        type: 'success',
        text1: '저장 완료',
        text2: '영성일기가 저장되었습니다.',
        visibilityTime: 2000,
      });

      // 강제 나가기 설정 후 즉시 나가기
      setIsForceExit(true);
      navigation.goBack();
    } catch (error) {
      console.error('Save journal error:', error);
      Toast.show({
        type: 'error',
        text1: '저장 실패',
        text2: '일기 저장 중 오류가 발생했습니다.',
        visibilityTime: 3000,
      });
    }
  };

  const handleShareToGroup = () => {
    groupShareBottomSheetRef.current?.present();
  };

  const handleEmotionPress = () => {
    emotionBottomSheetRef.current?.present();
  };

  const handleSelectEmotion = (emotion: Emotion) => {
    setSelectedEmotion(emotion);
  };

  const handleSelectGroups = (groupIds: string[]) => {
    setSelectedGroupIds(groupIds);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Journal Header - 날짜, 요일, 감정 아이콘 */}
        <View style={styles.headerContainer}>
          <JournalHeader
            date={journalDate}
            emotion={selectedEmotion || defaultEmotion}
            onEmotionPress={handleEmotionPress}
            defaultEmotion={defaultEmotion}
          />
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {/* 스크롤 가능한 질문-답변 영역 */}
        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.contentContainer}>
            {answers.map((item, index) => (
              <View key={item.question_id} style={styles.questionContainer}>
                <Text style={styles.questionText}>{item.question_text}</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.textInput}
                    placeholder={item.placeholder}
                    placeholderTextColor={colors['light-grey-02']}
                    value={item.answer}
                    onChangeText={(text) => handleAnswerChange(item.question_id, text)}
                    multiline
                    textAlignVertical="top"
                    editable={!createJournalMutation.isPending}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Footer - 하단 고정 버튼들 */}
        <View style={[styles.footer, { paddingBottom: spacing[2] + spacing[1] + insets.bottom }]}>
          <View style={styles.footerContent}>
            {/* 순에 공유하기 버튼 */}
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareToGroup}
              disabled={createJournalMutation.isPending}>
              <View style={styles.shareIcon}>
                <Ionicons name="share-outline" size={13.5} color={colors.primary.DEFAULT} />
              </View>
              <Text
                style={[
                  styles.shareButtonText,
                  createJournalMutation.isPending && styles.disabledText,
                ]}>
                순에 공유하기({selectedGroupIds.length})
              </Text>
            </TouchableOpacity>

            {/* 저장하기 버튼 */}
            <TouchableOpacity
              style={[
                styles.saveButton,
                createJournalMutation.isPending && styles.saveButtonDisabled,
              ]}
              onPress={handleSaveJournal}
              disabled={createJournalMutation.isPending}>
              <Text style={styles.saveButtonText}>
                {createJournalMutation.isPending ? '저장 중...' : '저장하기'}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors['dark-grey-02']} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* 뒤로가기 확인 모달 */}
      <ConfirmationModal
        visible={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={handleExitConfirm}
        title="일기 작성 취소"
        message="작성 중인 내용이 삭제됩니다.&#10;정말 나가시겠습니까?"
        confirmText="나가기"
        cancelText="계속 작성"
      />

      {/* 감정 선택 BottomSheet */}
      <EmotionBottomSheet
        ref={emotionBottomSheetRef}
        onSelectEmotion={handleSelectEmotion}
        selectedEmotion={selectedEmotion || defaultEmotion}
      />

      {/* 순 공유 BottomSheet */}
      <GroupShareBottomSheet
        ref={groupShareBottomSheetRef}
        onSelectGroups={handleSelectGroups}
        initialSelectedGroups={selectedGroupIds}
      />

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        onClose={hideAlert}
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
  headerButton: {
    padding: spacing[2],
  },
  divider: {
    height: 1,
    backgroundColor: colors['light-grey-02'],
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing[4],
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
  footer: {
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
    paddingTop: spacing[4],
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
    marginRight: spacing[1],
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
    opacity: 0.6,
  },
});

export default CreateJournalPromptBasedScreen;
