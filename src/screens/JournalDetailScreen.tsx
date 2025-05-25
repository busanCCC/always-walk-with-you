import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, fontStyles } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/types';
import {
  useJournalDetailQuery,
  useQuestionsQuery,
  useDeleteJournalMutation,
} from '@/queries/journalQueries';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import JournalHeader from '@/components/common/JournalHeader';
import CustomHeader from '@/components/common/CustomHeader';
import ActionSheet from '@/components/common/ActionSheet';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import SharedGroupsViewBottomSheet, {
  SharedGroupsViewBottomSheetRef,
} from '@/components/common/SharedGroupsViewBottomSheet';
import { Journal } from '@/types/journal';
import { useAuthStore } from '@/store/authStore';
import Toast from 'react-native-toast-message';

type JournalDetailScreenRouteProp = RouteProp<RootStackParamList, 'JournalDetail'>;
type JournalDetailScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'JournalDetail'
>;

const JournalDetailScreen = () => {
  const navigation = useNavigation<JournalDetailScreenNavigationProp>();
  const route = useRoute<JournalDetailScreenRouteProp>();
  const journalId = route.params?.journalId;
  const insets = useSafeAreaInsets();

  const { data: journal, isLoading, isError, error } = useJournalDetailQuery(journalId || '');
  const { data: questions = [] } = useQuestionsQuery();
  const { mutate: deleteJournal } = useDeleteJournalMutation();
  const currentUserId = useAuthStore((state) => state.session?.user?.id);

  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const sharedGroupsBottomSheetRef = useRef<SharedGroupsViewBottomSheetRef>(null);

  const isOwnPost = journal?.user_id === currentUserId;

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          headerLeft={
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
              <Ionicons name="chevron-back" size={20} color={colors['dark-grey-02']} />
            </TouchableOpacity>
          }
          headerRight={
            <TouchableOpacity
              onPress={() => setActionSheetVisible(true)}
              style={styles.headerButton}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors['dark-grey-02']} />
            </TouchableOpacity>
          }
          noBorder
        />
      ),
    });
  }, [navigation]);

  useEffect(() => {
    if (journal) {
      console.log('journal', journal);
    }
  }, [journal, navigation]);

  // 자유 작성 일기 렌더링
  const renderFreeWritingContent = (journal: Journal) => {
    const content = journal.journal_entries?.[0]?.text_content;
    return (
      <View style={styles.contentContainer}>
        <Text style={styles.journalContentText}>{content}</Text>
      </View>
    );
  };

  // 질문 기반 일기 렌더링
  const renderPromptBasedContent = (journal: Journal) => {
    const answers = journal.journal_entries?.filter((entry) => entry.entry_type === 'answer') || [];

    // 답변을 order 순서대로 정렬
    const sortedAnswers = [...answers].sort((a, b) => a.entry_order - b.entry_order);

    return (
      <View style={styles.contentContainer}>
        {sortedAnswers.map((entry, index) => {
          const questionIndex = entry.entry_order - 1;
          const question = questions[questionIndex];

          return (
            <View key={entry.id} style={styles.qaCard}>
              <View style={styles.questionSection}>
                <View style={styles.questionHeader}>
                  <View style={styles.questionNumber}>
                    <Text style={styles.questionNumberText}>Q{index + 1}</Text>
                  </View>
                  <Text style={styles.questionText}>
                    {question?.content || `질문 ${index + 1}`}
                  </Text>
                </View>
              </View>

              {/* 답변 */}
              <View style={styles.answerSection}>
                <Text style={styles.answerText}>{entry.text_content}</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const handleDeleteJournal = () => {
    if (!journal || !currentUserId) {
      Toast.show({
        type: 'error',
        text1: '삭제 오류',
        text2: '일기를 삭제할 수 없습니다.',
        visibilityTime: 2000,
      });
      return;
    }

    setIsDeleting(true);
    deleteJournal(
      { journalId: journal.id, userId: currentUserId },
      {
        onSuccess: () => {
          Toast.show({
            type: 'success',
            text1: '일기 삭제 완료',
            text2: '일기가 성공적으로 삭제되었습니다.',
            visibilityTime: 2000,
          });
          navigation.goBack();
        },
        onError: (error) => {
          console.error('Delete journal error:', error);
          Toast.show({
            type: 'error',
            text1: '삭제 실패',
            text2: '일기 삭제 중 오류가 발생했습니다.',
            visibilityTime: 3000,
          });
        },
        onSettled: () => {
          setIsDeleting(false);
          setDeleteConfirmVisible(false);
        },
      }
    );
  };

  const handleEditJournal = () => {
    if (journal?.id) {
      navigation.navigate('EditJournal', { journalId: journal.id });
    }
  };

  const handleReportJournal = () => {
    // TODO: 신고 기능 구현
    Toast.show({
      type: 'info',
      text1: '신고 기능',
      text2: '신고 기능은 곧 추가될 예정입니다.',
      visibilityTime: 2000,
    });
  };

  const actionSheetOptions = isOwnPost
    ? [
        {
          label: '수정하기',
          icon: 'create-outline',
          onPress: handleEditJournal,
        },
        {
          label: '삭제하기',
          icon: 'trash-outline',
          onPress: () => setDeleteConfirmVisible(true),
          destructive: true,
        },
      ]
    : [
        {
          label: '신고하기',
          icon: 'flag-outline',
          onPress: handleReportJournal,
        },
      ];

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (isError || !journal) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>{error?.message || '일기 정보를 불러올 수 없습니다.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.headerContainer}>
          <JournalHeader date={new Date(journal.date)} emotion={journal.emotion} />
        </View>
        <View style={styles.separator} />

        {/* 일기 모드에 따라 다른 컨텐츠 렌더링 */}
        {journal.mode === 'prompt_based'
          ? renderPromptBasedContent(journal)
          : renderFreeWritingContent(journal)}
      </ScrollView>

      <View style={[styles.bottomActionsContainer, { paddingBottom: spacing[3] + insets.bottom }]}>
        {/* 공유된 순 정보 */}
        <TouchableOpacity
          style={styles.sharedGroupsButton}
          onPress={() => sharedGroupsBottomSheetRef.current?.present()}
          activeOpacity={0.7}>
          {journal.shared_groups && journal.shared_groups.length > 0 ? (
            <View style={styles.shareIcon}>
              <Ionicons name="people" size={13.5} color={colors.primary.DEFAULT} />
            </View>
          ) : (
            <View style={styles.shareIcon}>
              <Ionicons name="lock-closed-outline" size={13.5} color={colors.primary.DEFAULT} />
            </View>
          )}
          <Text style={styles.sharedGroupsButtonText}>
            {journal.shared_groups && journal.shared_groups.length > 0
              ? `공유된 순(${journal.shared_groups.length})`
              : '비공개'}
          </Text>
        </TouchableOpacity>

        {/* 우측 액션들 */}
        <View style={styles.rightActions}>
          <View style={styles.actionItem}>
            <Ionicons name="chatbubble-outline" size={20} color={colors['grey-02']} />
            <Text style={styles.actionText}>댓글(0)</Text>
          </View>
          <View style={styles.actionItem}>
            <Ionicons name="heart-outline" size={20} color={colors['grey-02']} />
            <Text style={styles.actionText}>좋아요</Text>
          </View>
        </View>
      </View>

      {/* ActionSheet */}
      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        options={actionSheetOptions}
        title={isOwnPost ? '일기 관리' : '신고하기'}
      />

      {/* Delete Confirmation */}
      <ConfirmationModal
        visible={deleteConfirmVisible}
        title="일기 삭제"
        message="정말로 이 일기를 삭제하시겠습니까?&#10;삭제된 일기는 복구할 수 없습니다."
        confirmText={isDeleting ? '삭제 중...' : '삭제'}
        confirmButtonColor={colors.danger.DEFAULT}
        onConfirm={isDeleting ? () => {} : handleDeleteJournal}
        onClose={() => !isDeleting && setDeleteConfirmVisible(false)}
      />

      {/* Shared Groups View */}
      <SharedGroupsViewBottomSheet
        ref={sharedGroupsBottomSheetRef}
        sharedGroupIds={journal.shared_groups || []}
      />
    </View>
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
  navigationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
    paddingHorizontal: spacing[4],
  },
  navButton: {
    padding: spacing[2],
  },
  navTitleContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: spacing[4],
  },
  journalContentText: {
    ...fontStyles['base-normal'],
    color: colors['dark-grey-02'],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
  },
  bottomActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors['light-grey-02'],
    backgroundColor: colors.white,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    ...fontStyles['sm-normal'],
    color: colors['grey-01'],
    marginLeft: spacing[1],
  },
  separator: {
    height: 1,
    backgroundColor: colors['light-grey-02'],
  },
  headerContainer: {
    paddingHorizontal: spacing[4],
  },
  contentContainer: {
    paddingVertical: spacing[4],
  },
  qaCard: {
    marginHorizontal: spacing[4],
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: 1,
    borderColor: colors['light-grey-02'],
  },
  questionSection: {
    marginBottom: spacing[3],
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[3],
    marginTop: spacing[0.5],
  },
  questionNumberText: {
    ...fontStyles['sm-tight'],
    color: colors.primary.DEFAULT,
  },
  questionText: {
    ...fontStyles['base-tight'],
    color: colors['dark-grey-02'],
    flex: 1,
  },
  answerSection: {},
  answerText: {
    ...fontStyles['base-normal'],
    color: colors['dark-grey-01'],
  },
  sharedGroupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: spacing[1],
    borderColor: colors['light-grey-02'],
  },
  shareIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[0.5],
  },
  sharedGroupsButtonText: {
    ...fontStyles['sm-normal'],
    color: colors.primary.DEFAULT,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
});

export default JournalDetailScreen;
