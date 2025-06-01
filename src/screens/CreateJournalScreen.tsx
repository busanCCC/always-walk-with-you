import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import CustomHeader from '@/components/common/CustomHeader';
import JournalEditorForm from '@/components/journal/JournalEditorForm';
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
  useJournalExistsForDate,
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

type CreateJournalRouteProp =
  | NativeStackScreenProps<RootStackParamList, 'CreateJournalFreeWrite'>['route']
  | NativeStackScreenProps<RootStackParamList, 'CreateJournalPrompt'>['route'];

const CreateJournalScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CreateJournalRouteProp>();
  const selectedDate = route.params?.selectedDate;
  const mode = route.name === 'CreateJournalFreeWrite' ? 'free_writing' : 'prompt_based';

  const [content, setContent] = useState('');
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
  const groupShareBottomSheetRef = useRef<GroupShareBottomSheetRef>(null);

  // 데이터 가져오기
  const { data: emotions = [] } = useEmotionsQuery();
  const { data: questions = [] } = useQuestionsQuery();

  // 저널 생성 mutation
  const createJournalMutation = useCreateJournalMutation();

  // 사용자 정보
  const userId = useAuthStore((state) => state.session?.user?.id);

  // 기본 행복 감정 찾기 (이름이 '행복'인 감정을 찾거나 첫 번째 감정 사용)
  const defaultEmotion = emotions.find((emotion) => emotion.name === '행복') || emotions[0];

  // 선택된 날짜 또는 오늘 날짜 (현지 시간 기준으로 정확히 변환)
  const journalDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00') // 현지 시간 기준으로 자정 설정
    : new Date(getTodayString() + 'T00:00:00'); // 오늘 날짜도 현지 시간 기준으로

  // 날짜 문자열 (YYYY-MM-DD 형식)
  const dateString = selectedDate || getTodayString();

  // 해당 날짜에 이미 일기가 존재하는지 확인
  const { data: journalExists, isLoading: isCheckingExists } = useJournalExistsForDate(dateString);

  // 이미 일기가 존재하는 경우 알림 표시 후 뒤로 가기
  React.useEffect(() => {
    if (!isCheckingExists && journalExists) {
      const dateObj = new Date(dateString);
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();
      const formattedDate = selectedDate ? `${month}월 ${day}일` : '오늘';

      showAlert(
        '일기 작성 제한',
        `${formattedDate}은 이미 일기를 작성하셨습니다.\n하루에 하나의 일기만 작성할 수 있어요.`
      );
    }
  }, [isCheckingExists, journalExists, dateString, selectedDate, navigation]);

  // 답변이 있는지 확인하는 함수 (prompt_based mode용)
  const hasAnyAnswer = () => {
    return answers.some((answer) => answer.answer.trim() !== '');
  };

  // 내용이 있는지 확인하는 함수
  const hasContent = () => {
    return mode === 'free_writing' ? content.trim() !== '' : hasAnyAnswer();
  };

  // 뒤로가기 방지
  useFocusEffect(
    useCallback(() => {
      const subscription = navigation.addListener('beforeRemove', (e) => {
        if (!hasContent() || isForceExit || createJournalMutation.isPending) {
          return; // 내용이 없거나 강제 나가기 또는 저장 중이면 그냥 나가기
        }

        e.preventDefault();
        setShowExitModal(true);
      });

      return subscription;
    }, [navigation, content, answers, isForceExit, createJournalMutation.isPending, mode])
  );

  // 질문들이 로드되면 초기 답변 상태 설정 (prompt_based mode일 때만)
  useEffect(() => {
    if (mode === 'prompt_based' && questions.length > 0 && answers.length === 0) {
      const initialAnswers: QuestionAnswer[] = questions.map((question) => ({
        question_id: question.id,
        question_text: question.content,
        answer: '',
        placeholder: question.placeholder || '',
        order: question.order_index,
      }));
      setAnswers(initialAnswers);
    }
  }, [mode, questions, answers.length]);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          headerLeft={
            <TouchableOpacity
              onPress={() => {
                if (hasContent() && !createJournalMutation.isPending) {
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
  }, [navigation, content, answers, mode]);

  const handleExitConfirm = () => {
    setShowExitModal(false);
    setIsForceExit(true);
    // 다음 프레임에서 나가기 실행
    setTimeout(() => {
      navigation.goBack();
    }, 0);
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

    const emotionToSave = selectedEmotion || defaultEmotion;
    if (!emotionToSave) {
      showAlert('오류', '감정을 선택해주세요.');
      return;
    }

    if (mode === 'free_writing') {
      if (!content.trim()) {
        showAlert('내용 입력', '일기 내용을 입력해주세요.');
        return;
      }
    } else {
      const filledAnswers = answers.filter((item) => item.answer.trim() !== '');
      if (filledAnswers.length === 0) {
        showAlert('내용 입력', '최소 하나 이상의 질문에 답변해주세요.');
        return;
      }
    }

    try {
      // 선택된 날짜가 있으면 그 날짜로, 없으면 오늘 날짜로 (현지 시간 기준)
      // const dateString = selectedDate || getTodayString(); // 이미 위에서 선언됨

      if (mode === 'free_writing') {
        await createJournalMutation.mutateAsync({
          user_id: userId,
          date: dateString,
          mode: 'free_writing',
          emotion_id: emotionToSave.id,
          content: content.trim(),
          shared_groups: selectedGroupIds,
        });
      } else {
        const filledAnswers = answers.filter((item) => item.answer.trim() !== '');
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
      }

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

      // 중복 생성 에러인지 확인
      const isUniqueConstraintError =
        error instanceof Error && error.message.includes('unique_user_date_journal');

      if (isUniqueConstraintError) {
        const dateObj = new Date(dateString);
        const month = dateObj.getMonth() + 1;
        const day = dateObj.getDate();
        const formattedDate = selectedDate ? `${month}월 ${day}일` : '오늘';

        showAlert(
          '일기 작성 제한',
          `${formattedDate}은 이미 일기를 작성하셨습니다.\n하루에 하나의 일기만 작성할 수 있어요.`
        );
      } else {
        Toast.show({
          type: 'error',
          text1: '저장 실패',
          text2: '일기 저장 중 오류가 발생했습니다.',
          visibilityTime: 3000,
        });
      }
    }
  };

  const handleSelectEmotion = (emotion: Emotion) => {
    setSelectedEmotion(emotion);
  };

  const handleSelectGroups = (groupIds: string[]) => {
    setSelectedGroupIds(groupIds);
  };

  // 질문별 답변 업데이트 처리 (prompt_based mode용)
  const handlePromptAnswerChange = (order: number, text: string) => {
    setAnswers((prev) =>
      prev.map((item) => (item.order === order ? { ...item, answer: text } : item))
    );
  };

  return (
    <>
      <JournalEditorForm
        date={journalDate}
        selectedEmotion={selectedEmotion}
        mode={mode}
        freeWriteContent={content}
        onFreeWriteContentChange={setContent}
        promptAnswers={answers}
        onPromptAnswerChange={handlePromptAnswerChange}
        questions={questions}
        onSelectEmotion={handleSelectEmotion}
        defaultEmotion={defaultEmotion}
        onSave={handleSaveJournal}
        isSaving={createJournalMutation.isPending}
        showGroupShare={true}
        selectedGroupIds={selectedGroupIds}
        onShareToGroup={() => groupShareBottomSheetRef.current?.present()}
        onSelectGroups={handleSelectGroups}
        disabled={createJournalMutation.isPending}
      />

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
    </>
  );
};

const styles = StyleSheet.create({
  headerButton: {
    padding: spacing[2],
  },
});

export default CreateJournalScreen;
