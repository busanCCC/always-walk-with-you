import React, { useState, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, fontStyles, fonts } from '@/constants/theme';
import { JournalMode } from '@/types/journal';
import { RootStackParamList } from '@/navigation/types';
import CustomHeader from '@/components/common/CustomHeader';
import AlertModal from '@/components/common/AlertModal';
import { useJournalExistsForDate } from '@/queries/journalQueries';
import { getTodayString } from '@/utils/journalUtils';

interface ModeOption {
  mode: JournalMode;
  title: string;
  description: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    mode: 'prompt_based',
    title: '질문따라 작성하기',
    description: '질문에 따라 쉽게 영성일기를 작성해볼게요',
    iconName: 'chatbubbles',
  },
  {
    mode: 'free_writing',
    title: '그냥 쓸래요',
    description: '마음 가는 대로 자유롭게 써볼게요',
    iconName: 'create',
  },
];

type SelectJournalModeNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SelectJournalMode'
>;

type SelectJournalModeRouteProp = NativeStackScreenProps<
  RootStackParamList,
  'SelectJournalMode'
>['route'];

const SelectJournalModeScreen: React.FC = () => {
  const navigation = useNavigation<SelectJournalModeNavigationProp>();
  const route = useRoute<SelectJournalModeRouteProp>();
  const selectedDate = route.params?.selectedDate;

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

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

      setAlertModal({
        visible: true,
        title: '일기 작성 제한',
        message: `${formattedDate}에는 이미 일기를 작성하셨습니다.\n하루에 하나의 일기만 작성할 수 있어요.`,
      });
    }
  }, [isCheckingExists, journalExists, dateString, selectedDate, navigation]);

  const hideAlert = () => {
    setAlertModal({ visible: false, title: '', message: '' });
    navigation.goBack();
  };

  // 제목 텍스트 생성
  const getHeaderTitle = () => {
    if (selectedDate) {
      const date = new Date(selectedDate);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${month}월 ${day}일 영성 일기는\n어떤 방법으로 작성해 볼까요?`;
    }
    return `오늘은 어떤 방법으로\n영성일기를 작성해 볼까요?`;
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      header: () => (
        <CustomHeader
          headerLeft={
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerButtonContainer}>
              <Ionicons name="chevron-back" size={20} color={colors['dark-grey-02']} />
            </TouchableOpacity>
          }
          noBorder
        />
      ),
    });
  }, [navigation]);

  const handleModePress = (mode: JournalMode) => {
    if (mode === 'free_writing') {
      navigation.replace('CreateJournalFreeWrite', { selectedDate });
    } else if (mode === 'prompt_based') {
      navigation.replace('CreateJournalPrompt', { selectedDate });
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>

      <View style={styles.optionsContainer}>
        {MODE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.mode}
            style={styles.optionCard}
            onPress={() => handleModePress(option.mode)}
            activeOpacity={0.7}>
            <View style={styles.optionTextContainer}>
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <View style={styles.optionIconContainer}>
              <Ionicons name={option.iconName} size={52} color={colors['light-grey-02']} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        onClose={hideAlert}
        title={alertModal.title}
        message={alertModal.message}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  contentContainer: {
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['8'],
    paddingBottom: spacing['8'],
  },
  headerTitle: {
    ...(fontStyles['2xl-tight'] ?? { fontFamily: fonts.semiBold, fontSize: 24 }),
    color: colors['dark-grey-02'],
    textAlign: 'left',
    marginBottom: spacing['2'],
  },
  optionsContainer: {
    marginTop: spacing['10'],
  },
  optionCard: {
    backgroundColor: colors['light-grey-01'],
    borderRadius: 16,
    padding: spacing['4'],
    marginBottom: spacing['4'],
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: 'rgba(149, 149, 149, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    ...fontStyles['xl-tight'],
    color: colors['dark-grey-02'],
  },
  optionDescription: {
    ...fontStyles['sm-normal'],
    color: colors['grey-03'],
  },
  headerButtonContainer: {
    paddingVertical: spacing['2'],
  },
});

export default SelectJournalModeScreen;
