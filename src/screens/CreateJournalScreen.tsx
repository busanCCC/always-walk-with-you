import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
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
import { colors, spacing } from '@/constants/theme';
import { Emotion } from '@/types/journal';
import {
  useEmotionsQuery,
  useQuestionsQuery,
  useCreateJournalMutation,
  useJournalExistsForDate,
} from '@/queries/journalQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { RootStackParamList } from '@/navigation/types';
import { getTodayString } from '@/utils/journalUtils';
import Toast from 'react-native-toast-message';
import { localJournalApi } from '@/apis/localJournalApiDrizzle';
import { useNetwork } from '@/utils/networkManager';
import { createJournal } from '@/apis/journalApi';

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
  const queryClient = useQueryClient();
  const selectedDate = route.params?.selectedDate;
  const mode = route.name === 'CreateJournalFreeWrite' ? 'free_writing' : 'prompt_based';

  const [content, setContent] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [answers, setAnswers] = useState<QuestionAnswer[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isForceExit, setIsForceExit] = useState(false);
  const [isSaveSuccess, setIsSaveSuccess] = useState(false); // 저장 성공 상태 추가
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });
  const groupShareBottomSheetRef = useRef<GroupShareBottomSheetRef>(null);

  // 선택된 날짜 또는 오늘 날짜 (현지 시간 기준으로 정확히 변환)
  const journalDate = selectedDate
    ? new Date(selectedDate + 'T00:00:00') // 현지 시간 기준으로 자정 설정
    : new Date(getTodayString() + 'T00:00:00'); // 오늘 날짜도 현지 시간 기준으로

  // 데이터 가져오기
  const { data: emotions = [] } = useEmotionsQuery();
  const { data: questions = [] } = useQuestionsQuery(journalDate);

  // 일기 생성 mutation (기존 코드 - 필요시 폴백용)
  const createJournalMutation = useCreateJournalMutation();

  // 네트워크 상태
  const { isOnline } = useNetwork();

  // 사용자 정보
  const userId = useAuthStore((state) => state.session?.user?.id);

  // 로컬 일기 생성 상태
  const [isCreatingLocal, setIsCreatingLocal] = useState(false);

  // 기본 행복 감정 찾기 (이름이 '행복'인 감정을 찾거나 첫 번째 감정 사용)
  const defaultEmotion = emotions.find((emotion) => emotion.name === '행복') || emotions[0];

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
        if (!hasContent() || isForceExit || isCreatingLocal || isSaveSuccess) {
          return; // 내용이 없거나 강제 나가기 또는 저장 중/완료 시 그냥 나가기
        }

        e.preventDefault();
        setShowExitModal(true);
      });

      return subscription;
    }, [navigation, content, answers, isForceExit, isCreatingLocal, isSaveSuccess, mode])
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

  useLayoutEffect(() => {
    navigation.setOptions({
      // iOS에서 스와이프 뒤로가기 제스처 비활성화
      gestureEnabled: false,
      header: () => (
        <CustomHeader
          headerLeft={
            <TouchableOpacity
              onPress={() => {
                if (hasContent() && !isCreatingLocal && !isSaveSuccess) {
                  setShowExitModal(true);
                } else {
                  navigation.goBack();
                }
              }}
              style={styles.headerButton}>
              <Ionicons name="chevron-back" size={24} color={colors['dark-grey-02']} />
            </TouchableOpacity>
          }
          noBorder
        />
      ),
    });
  }, [navigation]);

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

    setIsCreatingLocal(true);

    try {
      // 🗄️ 로컬 DB에 일기 생성
      let localJournalData;

      if (mode === 'free_writing') {
        localJournalData = {
          user_id: userId,
          date: dateString,
          mode: 'free_writing' as const,
          emotion_id: emotionToSave.id,
          content: content.trim(),
          shared_groups: selectedGroupIds,
        };
      } else {
        const filledAnswers = answers.filter((item) => item.answer.trim() !== '');
        const answersData = filledAnswers.map((item) => ({
          answer: item.answer.trim(),
          order: item.order,
        }));

        localJournalData = {
          user_id: userId,
          date: dateString,
          mode: 'prompt_based' as const,
          emotion_id: emotionToSave.id,
          answers: answersData,
          shared_groups: selectedGroupIds,
        };
      }

      // 로컬 일기 생성
      const createdJournal = await localJournalApi.createJournal(localJournalData);
      console.log('📝 Local journal created:', createdJournal.localId);

      // 📤 그룹 공유가 있다면 온라인에서만 처리
      if (selectedGroupIds.length > 0) {
        if (!isOnline) {
          // 오프라인에서는 그룹 공유 불가 - 이 상황은 발생하지 않아야 함 (UI에서 차단)
          Toast.show({
            type: 'error',
            text1: '공유 실패',
            text2: '그룹 공유는 온라인 상태에서만 가능합니다.',
            visibilityTime: 3000,
          });
          setIsCreatingLocal(false);
          return;
        }

        // 온라인: 서버에 바로 생성하고 로컬 일기 업데이트
        const serverData = {
          user_id: userId,
          date: dateString,
          mode: localJournalData.mode,
          emotion_id: emotionToSave.id,
          shared_groups: selectedGroupIds,
          ...(mode === 'free_writing'
            ? { content: content.trim() }
            : { answers: (localJournalData as any).answers }),
        };

        try {
          const serverJournal = await createJournal(serverData);

          // 로컬 일기에 서버 ID 업데이트
          await localJournalApi.updateSyncStatus(
            createdJournal.localId,
            'synced',
            serverJournal.id
          );

          Toast.show({
            type: 'success',
            text1: '저장 완료',
            text2: '일기가 저장되고 그룹에 공유되었습니다.',
            visibilityTime: 2000,
          });
        } catch (error) {
          console.error('서버 일기 생성 실패:', error);
          Toast.show({
            type: 'error',
            text1: '공유 실패',
            text2: '일기는 저장되었지만 그룹 공유에 실패했습니다.',
            visibilityTime: 3000,
          });
        }
      } else {
        // 로컬 전용 저장
        Toast.show({
          type: 'success',
          text1: '저장 완료',
          text2: '일기가 저장되었습니다.',
          visibilityTime: 2000,
        });
      }

      // React Query 캐시 무효화 (화면 즉시 반영)
      queryClient.invalidateQueries({
        queryKey: ['localJournals'],
      });
      queryClient.invalidateQueries({
        queryKey: ['emotions'],
      });

      // 저장 성공 후 강제 나가기 설정
      setIsSaveSuccess(true);
      setIsForceExit(true);
      navigation.goBack();
    } catch (error) {
      console.error('Save journal error:', error);

      // 하루 1개 제약 에러 확인
      if (error instanceof Error && error.message.includes('해당 날짜에 이미 일기가 존재합니다')) {
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
    } finally {
      setIsCreatingLocal(false);
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
        isSaving={isCreatingLocal}
        showGroupShare={true}
        selectedGroupIds={selectedGroupIds}
        onShareToGroup={() => {
          if (!isOnline) {
            Toast.show({
              type: 'info',
              text1: '오프라인 모드',
              text2: '그룹 공유는 온라인 상태에서만 가능합니다.',
              visibilityTime: 2000,
            });
            return;
          }
          groupShareBottomSheetRef.current?.present();
        }}
        onSelectGroups={handleSelectGroups}
        disabled={isCreatingLocal}
        isOnline={isOnline}
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
    paddingVertical: spacing[2],
  },
});

export default CreateJournalScreen;
