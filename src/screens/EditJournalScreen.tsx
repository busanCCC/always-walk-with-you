import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import Ionicons from '@expo/vector-icons/Ionicons';

import { RootStackParamList } from '@/navigation/types';
import { fetchJournalById, fetchEmotions } from '@/apis/journalApi';
import { useAuthStore } from '@/store/authStore';
import { Emotion } from '@/types/journal';
import { useQuestionsQuery, useUpdateJournalMutation } from '@/queries/journalQueries';
import { colors, spacing, fontStyles } from '@/constants/theme';
import CustomHeader from '@/components/common/CustomHeader';
import JournalEditorForm from '@/components/journal/JournalEditorForm';
import GroupShareBottomSheet, {
  GroupShareBottomSheetRef,
} from '@/components/common/GroupShareBottomSheet';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import AlertModal from '@/components/common/AlertModal';
import { localJournalApi } from '@/apis/localJournalApiDrizzle';
import { useNetwork } from '@/utils/networkManager';
import { createJournal, updateJournal } from '@/apis/journalApi';

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
  const [isSaveSuccess, setIsSaveSuccess] = useState(false); // 저장 성공 상태 추가

  // 로컬 일기 상태
  const [localJournal, setLocalJournal] = useState<any>(null);
  const [isLoadingJournal, setIsLoadingJournal] = useState(true);
  const [isUpdatingJournal, setIsUpdatingJournal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 네트워크 상태
  const { isOnline } = useNetwork();

  // AlertModal state
  const [alertModal, setAlertModal] = useState({
    visible: false,
    title: '',
    message: '',
  });

  // 감정 데이터 조회 (React Query 유지)
  const {
    data: emotions,
    isLoading: isEmotionsLoading,
    error: emotionsError,
  } = useQuery({
    queryKey: ['emotions'],
    queryFn: fetchEmotions,
  });

  // 질문 데이터 조회 (일기 날짜 기준)
  const journalDate = localJournal?.date ? new Date(localJournal.date + 'T00:00:00') : new Date();
  const { data: questions = [] } = useQuestionsQuery(journalDate);

  // 일기 수정 mutation (기존 코드 - 필요시 폴백용)
  const updateMutation = useUpdateJournalMutation();

  // 로컬 일기 로드
  useEffect(() => {
    const loadLocalJournal = async () => {
      if (!journalId) return;

      setIsLoadingJournal(true);
      setLoadError(null);

      try {
        // 먼저 로컬 DB에서 조회 시도 (localId 또는 serverId 둘 다 가능)
        let journal;

        try {
          // journalId가 localId인 경우
          journal = await localJournalApi.getJournalById(journalId);

          // 공유 해제된 저널인지 확인하고 상태 업데이트
          if (journal.serverId && journal.sharedGroups && journal.sharedGroups.length === 0) {
            console.log(`🔄 공유 해제된 저널 확인: ${journal.localId}`);
            // serverId 제거하여 완전히 로컬 전용으로 변경
            await localJournalApi.updateSyncStatus(journal.localId, 'local', undefined, {
              unsharedAt: new Date().toISOString(),
              reason: '사용자가 공유 해제함',
            });

            // 업데이트된 저널 정보 다시 가져오기
            journal = await localJournalApi.getJournalById(journalId);
          }
        } catch (error) {
          // 로컬에서 찾을 수 없는 경우 - 에러 처리
          console.error('로컬에서 저널을 찾을 수 없음:', error);
          throw new Error(
            '해당 일기를 찾을 수 없습니다. 삭제되었거나 접근 권한이 없을 수 있습니다.'
          );
        }

        setLocalJournal(journal);

        // 초기 상태 설정
        if (journal.emotionId && emotions) {
          const emotion = emotions.find((e) => e.id === journal.emotionId);
          setSelectedEmotion(emotion || null);
        }

        if (journal.mode === 'free_writing' && journal.entries?.length > 0) {
          const firstEntry = journal.entries[0];
          // 로컬 일기과 서버 일기 모두 지원
          const content = (firstEntry as any).textContent || (firstEntry as any).text_content || '';
          setFreeWriteContent(content);
        } else if (journal.mode === 'prompt_based' && journal.entries?.length > 0) {
          const answers = journal.entries
            .filter((entry: any) => entry.entryType === 'answer' || entry.entry_type === 'answer')
            .map((entry: any) => ({
              answer: entry.textContent || entry.text_content || '',
              order: entry.entryOrder || entry.entry_order || 0,
            }))
            .sort((a, b) => a.order - b.order);
          setPromptAnswers(answers);
        }

        if (journal.sharedGroups) {
          const groups = JSON.parse(journal.sharedGroups);
          setSelectedGroupIds(groups || []);
        }
      } catch (error) {
        console.error('Failed to load journal:', error);
        setLoadError(error instanceof Error ? error.message : '일기를 불러올 수 없습니다.');
      } finally {
        setIsLoadingJournal(false);
      }
    };

    loadLocalJournal();
  }, [journalId, emotions]);

  // 뮤테이션 성공 처리 (현재는 사용하지 않음 - 로컬 저장 방식 사용)
  React.useEffect(() => {
    if (updateMutation.isSuccess) {
      Toast.show({
        type: 'success',
        text1: '수정 완료',
        text2: '일기가 성공적으로 수정되었습니다.',
        visibilityTime: 2000,
      });
      setIsSaveSuccess(true);
      setIsForceExit(true);
      navigation.goBack();
    }
  }, [updateMutation.isSuccess, navigation]);

  // 뮤테이션 에러 처리
  React.useEffect(() => {
    if (updateMutation.isError) {
      console.error('일기 수정 실패:', updateMutation.error);
      Toast.show({
        type: 'error',
        text1: '수정 실패',
        text2: '일기 수정 중 오류가 발생했습니다.',
        visibilityTime: 3000,
      });
    }
  }, [updateMutation.isError, updateMutation.error]);

  // 뒤로가기 방지
  useFocusEffect(
    useCallback(() => {
      const subscription = navigation.addListener('beforeRemove', (e) => {
        // 저장 완료, 강제 나가기, 저장 중이면 그냥 나가기
        if (isSaveSuccess || isForceExit || isUpdatingJournal) {
          return;
        }

        // 변경사항 없으면 그냥 나가기
        if (!hasChanges()) {
          return;
        }

        e.preventDefault();
        setShowExitModal(true);
      });

      return subscription;
    }, [
      navigation,
      localJournal,
      selectedEmotion,
      freeWriteContent,
      promptAnswers,
      selectedGroupIds,
      isForceExit,
      isUpdatingJournal,
      isSaveSuccess,
    ])
  );

  // 뒤로가기 핸들러
  useLayoutEffect(() => {
    navigation.setOptions({
      // iOS에서 스와이프 뒤로가기 제스처 비활성화
      gestureEnabled: false,
      header: () => (
        <CustomHeader
          headerLeft={
            <TouchableOpacity
              onPress={() => {
                // 저장 완료, 강제 나가기, 저장 중이면 그냥 나가기
                if (isSaveSuccess || isForceExit || isUpdatingJournal) {
                  navigation.goBack();
                  return;
                }

                // 변경사항 있으면 확인 다이얼로그
                if (hasChanges()) {
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
  }, [navigation, isForceExit, isUpdatingJournal, isSaveSuccess]);

  const hasChanges = () => {
    if (!localJournal) return false;

    // 감정 변경 확인
    const originalEmotionId = localJournal.emotionId;
    if (selectedEmotion?.id !== originalEmotionId) return true;

    // 순 공유 변경 확인
    const originalGroupIds = localJournal.sharedGroups ? JSON.parse(localJournal.sharedGroups) : [];
    if (
      selectedGroupIds.length !== originalGroupIds.length ||
      !selectedGroupIds.every((id) => originalGroupIds.includes(id))
    ) {
      return true;
    }

    // 내용 변경 확인
    if (localJournal.mode === 'free_writing') {
      const originalEntry = localJournal.entries?.find(
        (entry: any) => entry.entryType === 'general' || entry.entry_type === 'general'
      );
      const originalContent =
        (originalEntry as any)?.textContent || (originalEntry as any)?.text_content || '';
      return freeWriteContent !== originalContent;
    } else if (localJournal.mode === 'prompt_based') {
      const originalAnswers = localJournal.entries
        ?.filter((entry: any) => entry.entryType === 'answer' || entry.entry_type === 'answer')
        .sort(
          (a: any, b: any) =>
            (a.entryOrder || a.entry_order || 0) - (b.entryOrder || b.entry_order || 0)
        );

      if (originalAnswers?.length !== promptAnswers.length) return true;

      return promptAnswers.some((answer, index) => {
        const originalEntry = originalAnswers?.[index] as any;
        const originalText = originalEntry?.textContent || originalEntry?.text_content || '';
        return answer.answer !== originalText;
      });
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

  const showAlert = (title: string, message: string) => {
    setAlertModal({ visible: true, title, message });
  };

  const hideAlert = () => {
    setAlertModal({ visible: false, title: '', message: '' });
  };

  const handleSave = async () => {
    if (!selectedEmotion) {
      showAlert('알림', '감정을 선택해주세요.');
      return;
    }

    if (localJournal?.mode === 'free_writing' && !freeWriteContent.trim()) {
      showAlert('알림', '일기 내용을 입력해주세요.');
      return;
    }

    if (localJournal?.mode === 'prompt_based') {
      const hasEmptyAnswer = promptAnswers.some((answer) => !answer.answer.trim());
      if (hasEmptyAnswer) {
        showAlert('알림', '모든 질문에 답변해주세요.');
        return;
      }
    }

    setIsUpdatingJournal(true);

    try {
      // 🗄️ 로컬 DB에서 일기 업데이트
      const updateData = {
        mode: localJournal.mode,
        emotion_id: selectedEmotion.id,
        shared_groups: selectedGroupIds,
        ...(localJournal.mode === 'free_writing'
          ? { content: freeWriteContent }
          : { answers: promptAnswers }),
      };

      const updatedJournal = await localJournalApi.updateJournal(localJournal.localId, updateData);
      console.log('📝 Local journal updated:', updatedJournal.localId);

      // 📤 그룹 공유 처리
      const originalGroupIds = localJournal.sharedGroups
        ? JSON.parse(localJournal.sharedGroups)
        : [];
      const hasGroupsChanged =
        selectedGroupIds.length !== originalGroupIds.length ||
        !selectedGroupIds.every((id) => originalGroupIds.includes(id));

      if (selectedGroupIds.length > 0) {
        // 그룹 공유가 있는 경우 - 온라인에서만 처리
        if (!isOnline) {
          Toast.show({
            type: 'error',
            text1: '수정 실패',
            text2: '그룹 공유 수정은 온라인 상태에서만 가능합니다.',
            visibilityTime: 3000,
          });
          setIsUpdatingJournal(false);
          return;
        }

        // 온라인: 서버에 바로 수정하고 로컬 일기 업데이트
        const serverData = {
          user_id: localJournal.userId,
          date: localJournal.date,
          mode: localJournal.mode,
          emotion_id: selectedEmotion.id,
          shared_groups: selectedGroupIds,
          ...(localJournal.mode === 'free_writing'
            ? { content: freeWriteContent }
            : { answers: promptAnswers }),
        };

        try {
          // 공유 해제된 저널인지 확인
          const currentJournal = await localJournalApi.getJournalById(localJournal.localId);

          if (
            currentJournal.serverId &&
            currentJournal.sharedGroups &&
            currentJournal.sharedGroups.length > 0
          ) {
            // 서버에 공유된 저널 업데이트
            await updateJournal(currentJournal.serverId, localJournal.userId, serverData);
          } else {
            // 로컬 전용 일기를 서버에 새로 생성
            const serverJournal = await createJournal(serverData);
            // 로컬 일기에 서버 ID 업데이트
            await localJournalApi.updateSyncStatus(
              localJournal.localId,
              'synced',
              serverJournal.id
            );
          }

          Toast.show({
            type: 'success',
            text1: '수정 완료',
            text2: '일기가 수정되고 그룹에 공유되었습니다.',
            visibilityTime: 2000,
          });
        } catch (error) {
          console.error('서버 일기 수정 실패:', error);
          Toast.show({
            type: 'success',
            text1: '수정 완료',
            text2:
              '일기는 수정되었지만 그룹 공유에 실패했습니다. 오프라인 상태에서 다시 시도해보세요.',
            visibilityTime: 3000,
          });
        }
      } else if (hasGroupsChanged && selectedGroupIds.length === 0 && originalGroupIds.length > 0) {
        // 그룹 공유 취소 처리 - 온라인에서만 처리
        if (!isOnline) {
          Toast.show({
            type: 'error',
            text1: '수정 실패',
            text2: '그룹 공유 취소는 온라인 상태에서만 가능합니다.',
            visibilityTime: 3000,
          });
          setIsUpdatingJournal(false);
          return;
        }

        // 공유 해제된 저널인지 확인
        const currentJournal = await localJournalApi.getJournalById(localJournal.localId);

        if (
          currentJournal.serverId &&
          currentJournal.sharedGroups &&
          currentJournal.sharedGroups.length > 0
        ) {
          // 서버에서 완전 삭제
          try {
            const { deleteJournal } = await import('@/apis/journalApi');
            await deleteJournal(currentJournal.serverId, localJournal.userId);

            // 로컬 일기에서 서버 ID 제거
            await localJournalApi.updateSyncStatus(localJournal.localId, 'local');

            Toast.show({
              type: 'success',
              text1: '수정 완료',
              text2: '일기가 수정되고 그룹 공유가 취소되었습니다.',
              visibilityTime: 2000,
            });
          } catch (error) {
            console.error('서버 일기 삭제 실패:', error);
            Toast.show({
              type: 'success',
              text1: '수정 완료',
              text2:
                '일기는 수정되었지만 그룹 공유 취소에 실패했습니다. 오프라인 상태에서 다시 시도해보세요.',
              visibilityTime: 3000,
            });
          }
        } else {
          // 로컬 전용 일기의 공유 취소
          Toast.show({
            type: 'success',
            text1: '수정 완료',
            text2: '일기가 수정되고 그룹 공유가 취소되었습니다.',
            visibilityTime: 2000,
          });
        }
      } else {
        // 로컬 전용 수정 또는 그룹 변경 없음
        Toast.show({
          type: 'success',
          text1: '수정 완료',
          text2: '일기가 수정되었습니다.',
          visibilityTime: 2000,
        });
      }

      // React Query 캐시 무효화 (화면 즉시 반영)
      queryClient.invalidateQueries({
        queryKey: ['localJournals'],
        refetchType: 'all',
      });
      queryClient.invalidateQueries({
        queryKey: ['emotions'],
      });
      queryClient.invalidateQueries({
        queryKey: ['groupJournals'],
      });

      // 특정 저널 상세 캐시도 무효화
      queryClient.removeQueries({
        queryKey: ['localJournals', 'detail', localJournal.localId],
      });

      // 저장 성공 후 강제 나가기 설정
      setIsSaveSuccess(true);
      setIsForceExit(true);
      navigation.goBack();
    } catch (error) {
      console.error('Update journal error:', error);
      Toast.show({
        type: 'error',
        text1: '수정 실패',
        text2: '일기 수정 중 오류가 발생했습니다.',
        visibilityTime: 3000,
      });
    } finally {
      setIsUpdatingJournal(false);
    }
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

  if (isLoadingJournal || isEmotionsLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (loadError || emotionsError || !localJournal) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={colors.secondary.DEFAULT}
          style={styles.errorIcon}
        />
        <Text style={styles.errorTitle}>일기를 불러올 수 없습니다</Text>
        <Text style={styles.errorText}>{loadError || '일기 정보를 불러올 수 없습니다.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => window.location.reload()}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <JournalEditorForm
        date={new Date(localJournal.date)}
        selectedEmotion={selectedEmotion}
        mode={localJournal.mode}
        freeWriteContent={freeWriteContent}
        onFreeWriteContentChange={setFreeWriteContent}
        promptAnswers={promptAnswers}
        onPromptAnswerChange={handlePromptAnswerChange}
        questions={questions}
        onSelectEmotion={handleSelectEmotion}
        onSave={handleSave}
        isSaving={isUpdatingJournal}
        saveButtonText="수정하기"
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
        disabled={isUpdatingJournal}
        isOnline={isOnline}
        leftFooterContent={
          <Text style={styles.modeText}>
            {localJournal.mode === 'free_writing' ? '자유 작성' : '질문 기반 작성'}
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

      {/* 알림 모달 */}
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
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    marginBottom: spacing[4],
  },
  errorTitle: {
    ...fontStyles['lg-normal'],
    color: colors.secondary.DEFAULT,
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  errorText: {
    color: colors.secondary.DEFAULT,
    fontSize: fontStyles['base-normal'].fontSize,
    textAlign: 'center',
    marginBottom: spacing[6],
    paddingHorizontal: spacing[4],
  },
  retryButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: spacing[2],
  },
  retryButtonText: {
    ...fontStyles['base-normal'],
    color: colors.white,
    fontWeight: 'bold',
  },
  headerButton: {
    paddingVertical: spacing[2],
  },
  modeText: {
    ...fontStyles['sm-normal'],
    color: colors['grey-02'],
  },
});

export default EditJournalScreen;
