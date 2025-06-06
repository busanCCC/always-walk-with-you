import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import theme, { colors, fontStyles, spacing } from '@/constants/theme';
import EmotionIcon from '@/components/common/EmotionIcon';
import AlertModal from '@/components/common/AlertModal';
import { Journal } from '@/types/journal';
import { useWeeklyJournalsQuery } from '@/queries/journalQueries';
import { formatDate as utilFormatDate, weekDays } from '@/utils/dateUtils';
import { hasJournalForDate, getTodayString } from '@/utils/journalUtils';

import PlusIcon from '@/assets/svg/plus-icon.svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LoadingScreen } from '@/navigation/components/LoadingScreen';

interface WeekDayData {
  day: string;
  date: number;
  fullDate: string;
  isToday: boolean;
  journal: Journal | null;
  hasEmotion: boolean;
  emotionImageUrl: string | null;
  isActive: boolean;
  isWritable: boolean;
}

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { data: journals, isLoading, isError, error, refetch } = useWeeklyJournalsQuery();

  const [alertModal, setAlertModal] = React.useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string) => {
    setAlertModal({ visible: true, title, message });
  };

  const hideAlert = () => {
    setAlertModal({ visible: false, title: '', message: '' });
  };

  const weekData: WeekDayData[] = React.useMemo(() => {
    const todayDate = new Date();
    return [0, 1, 2, 3, 4, 5, 6].map((offset) => {
      const date = new Date();
      date.setDate(todayDate.getDate() - todayDate.getDay() + offset);
      const formattedDate = utilFormatDate(date);

      const journalForDay = journals?.find((j) => j.date === formattedDate) || null;
      const emotionImageUrl = journalForDay?.emotion?.img_url || null;

      return {
        day: weekDays[date.getDay()],
        date: date.getDate(),
        fullDate: formattedDate,
        isToday: date.getDate() === todayDate.getDate() && date.getMonth() === todayDate.getMonth(),
        journal: journalForDay,
        hasEmotion: !!emotionImageUrl,
        emotionImageUrl: emotionImageUrl,
        isActive:
          date.getDate() === todayDate.getDate() && date.getMonth() === todayDate.getMonth(),
        isWritable:
          date.getDate() === todayDate.getDate() &&
          date.getMonth() === todayDate.getMonth() &&
          !journalForDay,
      };
    });
  }, [journals]);

  const handleBannerPress = () => {
    const urlToOpen = 'https://www.kccc.org/?p=sc';
    Linking.openURL(urlToOpen).catch((err) => console.error("Couldn't load page", err));
  };

  const handleDayPress = (dayData: WeekDayData) => {
    if (dayData.journal) {
      // 일기가 있는 경우 상세보기로 이동
      navigation.navigate('JournalDetail', { journalId: dayData.journal.id });
    } else {
      // 일기가 없는 경우 해당 날짜로 일기 작성으로 이동
      navigation.navigate('SelectJournalMode', { selectedDate: dayData.fullDate });
    }
  };

  const handleWritePromptPress = () => {
    const todayString = getTodayString();

    // 오늘 날짜에 이미 일기가 있는지 확인
    if (hasJournalForDate(journals || [], todayString)) {
      showAlert(
        '일기 작성 제한',
        '오늘은 이미 일기를 작성했습니다.\n다른 날의 일기를 작성하려면 캘린더에서 빈 날짜를 선택해주세요.'
      );
      return;
    }

    // 오늘 날짜에 일기가 없으면 일기 작성으로 이동
    navigation.navigate('SelectJournalMode', {});
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError && error) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centered]}>
        <Text style={{ color: colors.secondary.DEFAULT, marginBottom: spacing['3'] }}>
          {error.message || '주간 일기 정보를 가져오는데 실패했습니다.'}
        </Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
          <Text style={{ color: colors.white }}>재시도</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.weeklyDiarySection}>
          <Text style={styles.sectionTitle}>주간 영성 일기</Text>

          <View style={styles.weekCalendar}>
            {weekData.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.dayItem}
                onPress={() => handleDayPress(item)}
                activeOpacity={0.7}>
                <Text style={[styles.dayName, item.isActive && styles.activeDayText]}>
                  {item.day}
                </Text>
                <Text style={[styles.dateNumber, item.isActive && styles.activeDateNumber]}>
                  {item.date}
                </Text>

                <View style={[styles.dateCircle, item.isActive && styles.activeDateCircle]}>
                  {item.hasEmotion && item.emotionImageUrl ? (
                    <EmotionIcon imageUrl={item.emotionImageUrl} size={36} />
                  ) : (
                    item.isWritable && (
                      <View style={styles.writeIndicator}>
                        <PlusIcon width={18} height={18} />
                      </View>
                    )
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.writePrompt} onPress={handleWritePromptPress}>
          <Text style={styles.writePromptText}>영성 일기 작성하기</Text>
        </TouchableOpacity>

        {/* 배너 */}
        <View style={styles.banner}>
          <TouchableOpacity onPress={handleBannerPress} activeOpacity={0.8}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerSubtitle}>2025 CCC 여름수련회, 평창에서 만나요</Text>
              <Text style={styles.bannerTitle}>Seize Your Season</Text>
            </View>
            <Image source={require('@/assets/images/banner.png')} style={styles.bannerImage} />
          </TouchableOpacity>
        </View>

        <View style={styles.devotionalSection}>
          <Text style={styles.sectionTitle}>오늘의 풍성한 삶</Text>
          <View style={styles.devotionalCard}>
            <Text style={styles.devotionalTitle}>양은 그 오른편에 염소는 왼편에</Text>
            <Text style={styles.devotionalContent}>
              믿음, 말로만 충분할까요?{`\n`}
              예수님은 행함으로 나타나는 사랑을 보신다고 하셨어요.{`\n`}
              지금 당신의 삶을 돌아볼 시간입니다.
            </Text>
            <Text style={styles.devotionalVerse}>마태복음 25:31~36 </Text>
            <TouchableOpacity
              style={styles.arrowButton}
              onPress={() => {
                navigation.navigate('WebView', {
                  title: '오늘의 풍성한 삶',
                  url: 'https://www.kccc.org/?p=qt',
                });
              }}>
              <Ionicons name="chevron-forward" size={18} color={colors['grey-03']} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.prayerSection}>
          <Text style={styles.sectionTitle}>함께 기도할 제목들</Text>

          <View style={styles.prayerCard}>
            <View style={styles.prayerCardHeader}>
              <Text style={styles.prayerCardName}>가야대학교</Text>
            </View>
            <Text style={styles.prayerCardContent}>
              캠퍼스에 복음이 심어질 수 있길{`\n`}
              동아리방이 구해질 수 있길{`\n`}
              순원들이 하나님을 정말로 사랑할 수 있길
            </Text>
          </View>

          {/* 기도 제목 카드 2 */}
          <View style={styles.prayerCard}>
            <View style={styles.prayerCardHeader}>
              <Text style={styles.prayerCardName}>부산대학교 장전캠퍼스</Text>
            </View>
            <Text style={styles.prayerCardContent}>
              예수 그리스도 한분만을 따라가는 성령 충만한 그리스도인으로 살아가는 순장, 순원들이
              되길{`\n`}
              복음을 전하며 선한 영향력을 끼치는 그리스도의 참된 제...
            </Text>
          </View>

          {/* 기도 제목 카드 3 */}
          <View style={styles.prayerCard}>
            <View style={styles.prayerCardHeader}>
              <Text style={styles.prayerCardName}>부산대학교 밀양캠</Text>
            </View>
            <Text style={styles.prayerCardContent}>
              캠퍼스에 하나님과 진실한 교제를 사모하는 사람들로 기도하는 자가 많이 세워질 수 있길
              {`\n`}
              신입생들이 CCC에 잘 접붙임 될 수 있길
            </Text>
          </View>
        </View>
      </ScrollView>
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
  safeArea: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary.DEFAULT,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['2'],
    borderRadius: 8,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing['4'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing['4'],
  },
  logoContainer: {
    width: 58,
    height: 22,
  },
  weeklyDiarySection: {
    marginTop: spacing['4'],
  },
  sectionTitle: {
    ...fontStyles['xl-tight'],
    color: colors['grey-04'],
    marginBottom: spacing['3'],
  },
  weekCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    shadowColor: 'rgba(149, 149, 149, 0.1)',
    elevation: 2,
  },
  dayItem: {
    alignItems: 'center',
    width: 48,
    height: 88,
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  dayName: {
    ...fontStyles['sm-normal'],
    color: colors['grey-01'],
    marginBottom: spacing['1'],
  },
  activeDayText: {
    color: colors.primary.DEFAULT,
    fontWeight: 'bold',
  },
  activeDateNumber: {
    color: colors.primary.DEFAULT,
    fontWeight: 'bold',
  },
  dateCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors['light-grey-01'],
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing['2'],
  },
  activeDateCircle: {
    backgroundColor: colors.primary.light,
  },
  dateNumber: {
    ...fontStyles['sm-normal'],
    color: colors['grey-01'],
  },
  emotionContainer: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  writeIndicator: {
    width: 18,
    height: 18,
  },
  writePrompt: {
    marginVertical: spacing['8'],
    backgroundColor: colors.primary.light,
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(149, 149, 149, 0.1)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  writePromptText: {
    ...fontStyles['base-tight'],
    color: colors.primary.DEFAULT,
  },
  devotionalSection: {
    marginTop: spacing['2'],
    marginBottom: spacing['6'],
  },
  devotionalCard: {
    backgroundColor: colors['light-grey-01'],
    borderRadius: 16,
    padding: spacing['4'],
    paddingTop: spacing['3'],
    shadowColor: 'rgba(149, 149, 149, 0.1)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  devotionalTitle: {
    ...fontStyles['base-tight'],
    color: colors['dark-grey-02'],
    marginBottom: spacing['1'],
  },
  devotionalContent: {
    ...fontStyles['xs-normal'],
    color: colors['dark-grey-01'],
    marginBottom: spacing['3'],
  },
  devotionalVerse: {
    ...fontStyles['2xs-normal'],
    color: colors['grey-03'],
    marginBottom: spacing['1'],
  },
  arrowButton: {
    position: 'absolute',
    top: spacing['3'],
    right: spacing['4'],
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  banner: {
    position: 'relative',
    height: 72,
    backgroundColor: colors.secondary.light,
    borderRadius: 16,
    marginBottom: spacing['5'],
    overflow: 'hidden',
    shadowColor: 'rgba(149, 149, 149, 0.1)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 12,
    backgroundColor: colors['dark-grey-02'],
    borderRadius: 16,
    opacity: 0.8,
    zIndex: 2,
  },
  bannerContent: {
    padding: spacing['4'],
    paddingTop: spacing['3.5'],
  },
  bannerSubtitle: {
    ...fontStyles['xs-normal'],
    color: colors['grey-03'],
    marginBottom: 0,
  },
  bannerTitle: {
    ...fontStyles['base-tight'],
    color: colors['dark-grey-02'],
  },
  bannerCounter: {
    ...fontStyles['2xs-normal'],
    color: colors.white,
    position: 'absolute',
    right: spacing['4'],
    bottom: spacing['1'],
    zIndex: 3,
  },
  bannerImage: {
    position: 'absolute',
    right: 16,
    bottom: 0,
    width: 90,
    height: 60,
  },
  prayerSection: {
    marginBottom: spacing['5'],
  },
  prayerCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    borderWidth: 1,
    borderColor: theme.colors['light-grey-02'],
  },
  prayerCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing['3'],
  },
  prayerCardIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing['2'],
  },
  prayerCardName: {
    ...fontStyles['sm-normal'],
    color: colors.black,
  },
  prayerCardContent: {
    ...fontStyles['xs-normal'],
    color: colors['dark-grey-01'],
  },
});

export default HomeScreen;
