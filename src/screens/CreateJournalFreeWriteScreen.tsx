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
import { Emotion } from '@/types/journal';
import { useEmotionsQuery, useCreateJournalMutation } from '@/queries/journalQueries';
import { useAuthStore } from '@/store/authStore';
import { RootStackParamList } from '@/navigation/types';
import { getTodayString } from '@/utils/journalUtils';
import Toast from 'react-native-toast-message';

type CreateJournalFreeWriteRouteProp = NativeStackScreenProps<
  RootStackParamList,
  'CreateJournalFreeWrite'
>['route'];

const CreateJournalFreeWriteScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CreateJournalFreeWriteRouteProp>();
  const selectedDate = route.params?.selectedDate;

  const [content, setContent] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<Emotion | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
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

  // 감정 데이터 가져오기
  const { data: emotions = [] } = useEmotionsQuery();

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

  // 뒤로가기 방지
  useFocusEffect(
    useCallback(() => {
      const subscription = navigation.addListener('beforeRemove', (e) => {
        if (!content.trim() || isForceExit || createJournalMutation.isPending) {
          return; // 내용이 없거나 강제 나가기 또는 저장 중이면 그냥 나가기
        }

        e.preventDefault();
        setShowExitModal(true);
      });

      return subscription;
    }, [navigation, content, isForceExit, createJournalMutation.isPending])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          headerLeft={
            <TouchableOpacity
              onPress={() => {
                if (content.trim() && !createJournalMutation.isPending) {
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
  }, [navigation, content]);

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

    if (!content.trim()) {
      showAlert('내용 입력', '일기 내용을 입력해주세요.');
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

      await createJournalMutation.mutateAsync({
        user_id: userId,
        date: dateString,
        mode: 'free_writing',
        emotion_id: emotionToSave.id,
        content: content.trim(),
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

        {/* 텍스트 입력 영역 */}
        <View style={styles.contentContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="오늘 하나님과 나눌 이야기를 기록해볼까요?"
            placeholderTextColor={colors['light-grey-02']}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            autoFocus
            editable={!createJournalMutation.isPending}
          />
        </View>

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
  contentContainer: {
    flex: 1,
    padding: spacing[4],
  },
  textInput: {
    flex: 1,
    ...fontStyles['base-normal'],
    fontSize: 14,
    color: colors['dark-grey-02'],
    lineHeight: 21,
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
    color: colors['light-grey-02'],
  },
});

export default CreateJournalFreeWriteScreen;
