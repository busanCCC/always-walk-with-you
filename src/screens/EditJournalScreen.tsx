import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import Ionicons from '@expo/vector-icons/Ionicons';

import { RootStackParamList } from '@/navigation/types';
import { fetchJournalById, updateJournal, fetchEmotions } from '@/apis/journalApi';
import { useAuthStore } from '@/store/authStore';
import { Journal, Emotion } from '@/types/journal';
import { useQuestionsQuery } from '@/queries/journalQueries';
import { colors, spacing, fontStyles } from '@/constants/theme';
import CustomHeader from '@/components/common/CustomHeader';
import JournalEditorForm from '@/components/journal/JournalEditorForm';
import GroupShareBottomSheet, {
  GroupShareBottomSheetRef,
} from '@/components/common/GroupShareBottomSheet';
import ConfirmationModal from '@/components/common/ConfirmationModal';

type EditJournalScreenRouteProp = RouteProp<RootStackParamList, 'EditJournal'>;
type EditJournalScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'EditJournal'>;

const EditJournalScreen = () => {
  const route = useRoute<EditJournalScreenRouteProp>();
  const navigation = useNavigation<EditJournalScreenNavigationProp>();
  const queryClient = useQueryClient();
  const { journalId } = route.params;
  const user = useAuthStore((state) => state.user);
  const groupShareBottomSheetRef = useRef<GroupShareBottomSheetRef>(null);

  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [freeWriteContent, setFreeWriteContent] = useState('');
  const [promptAnswers, setPromptAnswers] = useState<Array<{ answer: string; order: number }>>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [isForceExit, setIsForceExit] = useState(false);

  // 일기 데이터 조회
  const {
    data: journal,
    isLoading: isJournalLoading,
    error: journalError,
  } = useQuery({
    queryKey: ['journal', journalId],
    queryFn: () => fetchJournalById(journalId),
    enabled: !!journalId,
  });

  // 감정 데이터 조회
  const {
    data: emotions,
    isLoading: isEmotionsLoading,
    error: emotionsError,
  } = useQuery({
    queryKey: ['emotions'],
    queryFn: fetchEmotions,
  });

  // 질문 데이터 조회
  const { data: questions = [] } = useQuestionsQuery();

  // 일기 수정 mutation
  const updateMutation = useMutation({
    mutationFn: (updateData: {
      emotion_id?: string;
      content?: string;
      answers?: Array<{ answer: string; order: number }>;
      shared_groups?: string[];
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      return updateJournal(journalId, user.id, updateData);
    },
    onSuccess: (updatedJournal) => {
      Toast.show({
        type: 'success',
        text1: '수정 완료',
        text2: '일기가 성공적으로 수정되었습니다.',
        visibilityTime: 2000,
      });

      // 캐시 업데이트
      queryClient.setQueryData(['journal', journalId], updatedJournal);
      queryClient.invalidateQueries({ queryKey: ['journals'] });

      setIsForceExit(true);
      navigation.goBack();
    },
    onError: (error) => {
      console.error('일기 수정 실패:', error);
      Toast.show({
        type: 'error',
        text1: '수정 실패',
        text2: '일기 수정 중 오류가 발생했습니다.',
        visibilityTime: 3000,
      });
    },
  });

  // 뒤로가기 방지
  useFocusEffect(
    useCallback(() => {
      const subscription = navigation.addListener('beforeRemove', (e) => {
        if (!hasChanges() || isForceExit || updateMutation.isPending) {
          return;
        }

        e.preventDefault();
        setShowExitModal(true);
      });

      return subscription;
    }, [
      navigation,
      journal,
      selectedEmotion,
      freeWriteContent,
      promptAnswers,
      selectedGroupIds,
      isForceExit,
      updateMutation.isPending,
    ])
  );

  // 뒤로가기 핸들러
  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          headerLeft={
            <TouchableOpacity
              onPress={() => {
                if (hasChanges() && !isForceExit && !updateMutation.isPending) {
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
  }, [navigation, isForceExit, updateMutation.isPending]);

  // 초기 데이터 설정
  useEffect(() => {
    if (journal) {
      setSelectedEmotion(journal.emotion || null);
      setSelectedGroupIds(journal.shared_groups || []);

      if (journal.mode === 'free_writing') {
        const generalEntry = journal.journal_entries?.find(
          (entry) => entry.entry_type === 'general'
        );
        setFreeWriteContent(generalEntry?.text_content || '');
      } else if (journal.mode === 'prompt_based') {
        const answerEntries =
          journal.journal_entries
            ?.filter((entry) => entry.entry_type === 'answer')
            .sort((a, b) => a.entry_order - b.entry_order)
            .map((entry) => ({
              answer: entry.text_content || '',
              order: entry.entry_order,
            })) || [];
        setPromptAnswers(answerEntries);
      }
    }
  }, [journal]);

  const hasChanges = () => {
    if (!journal) return false;

    // 감정 변경 확인
    if (selectedEmotion?.id !== journal.emotion?.id) return true;

    // 순 공유 변경 확인
    const originalGroupIds = journal.shared_groups || [];
    if (
      selectedGroupIds.length !== originalGroupIds.length ||
      !selectedGroupIds.every((id) => originalGroupIds.includes(id))
    ) {
      return true;
    }

    // 내용 변경 확인
    if (journal.mode === 'free_writing') {
      const originalContent =
        journal.journal_entries?.find((entry) => entry.entry_type === 'general')?.text_content ||
        '';
      return freeWriteContent !== originalContent;
    } else if (journal.mode === 'prompt_based') {
      const originalAnswers = journal.journal_entries
        ?.filter((entry) => entry.entry_type === 'answer')
        .sort((a, b) => a.entry_order - b.entry_order);

      if (originalAnswers?.length !== promptAnswers.length) return true;

      return promptAnswers.some(
        (answer, index) => answer.answer !== (originalAnswers[index]?.text_content || '')
      );
    }

    return false;
  };

  const handleExitConfirm = () => {
    setShowExitModal(false);
    setIsForceExit(true);
    // 다음 프레임에서 나가기 실행
    setTimeout(() => {
      navigation.goBack();
    }, 0);
  };

  const handleSave = () => {
    if (!selectedEmotion) {
      Alert.alert('알림', '감정을 선택해주세요.');
      return;
    }

    if (journal?.mode === 'free_writing' && !freeWriteContent.trim()) {
      Alert.alert('알림', '일기 내용을 입력해주세요.');
      return;
    }

    if (journal?.mode === 'prompt_based') {
      const hasEmptyAnswer = promptAnswers.some((answer) => !answer.answer.trim());
      if (hasEmptyAnswer) {
        Alert.alert('알림', '모든 질문에 답변해주세요.');
        return;
      }
    }

    const updateData: {
      emotion_id?: string;
      content?: string;
      answers?: Array<{ answer: string; order: number }>;
      shared_groups?: string[];
    } = {
      emotion_id: selectedEmotion.id,
      shared_groups: selectedGroupIds,
    };

    if (journal?.mode === 'free_writing') {
      updateData.content = freeWriteContent;
    } else if (journal?.mode === 'prompt_based') {
      updateData.answers = promptAnswers;
    }

    updateMutation.mutate(updateData);
  };

  const handleSelectEmotion = (emotion: Emotion) => {
    setSelectedEmotion(emotion);
  };

  const handlePromptAnswerChange = (order: number, text: string) => {
    setPromptAnswers((prev) =>
      prev.map((answer) => (answer.order === order ? { ...answer, answer: text } : answer))
    );
  };

  const handleSelectGroups = (groupIds: string[]) => {
    setSelectedGroupIds(groupIds);
  };

  if (isJournalLoading || isEmotionsLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (journalError || emotionsError || !journal) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>일기 정보를 불러올 수 없습니다.</Text>
      </View>
    );
  }

  return (
    <>
      <JournalEditorForm
        date={new Date(journal.date)}
        selectedEmotion={selectedEmotion}
        mode={journal.mode}
        freeWriteContent={freeWriteContent}
        onFreeWriteContentChange={setFreeWriteContent}
        promptAnswers={promptAnswers}
        onPromptAnswerChange={handlePromptAnswerChange}
        questions={questions}
        onSelectEmotion={handleSelectEmotion}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
        saveButtonText="수정하기"
        showGroupShare={true}
        selectedGroupIds={selectedGroupIds}
        onShareToGroup={() => groupShareBottomSheetRef.current?.present()}
        onSelectGroups={handleSelectGroups}
        disabled={updateMutation.isPending}
        leftFooterContent={
          <Text style={styles.modeText}>
            {journal.mode === 'free_writing' ? '자유 작성' : '질문 기반 작성'}
          </Text>
        }
      />

      {/* 뒤로가기 확인 모달 */}
      <ConfirmationModal
        visible={showExitModal}
        onClose={() => setShowExitModal(false)}
        onConfirm={handleExitConfirm}
        title="일기 수정 취소"
        message="수정 중인 내용이 삭제됩니다.&#10;정말 나가시겠습니까?"
        confirmText="나가기"
        cancelText="계속 수정"
      />

      {/* 순 공유 BottomSheet */}
      <GroupShareBottomSheet
        ref={groupShareBottomSheetRef}
        onSelectGroups={handleSelectGroups}
        initialSelectedGroups={selectedGroupIds}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.secondary.DEFAULT,
    fontSize: fontStyles['base-normal'].fontSize,
  },
  headerButton: {
    padding: spacing[2],
  },
  modeText: {
    ...fontStyles['sm-normal'],
    color: colors['grey-02'],
  },
});

export default EditJournalScreen;
