import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Image,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Calendar, LocaleConfig, DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { useQueries, keepPreviousData, UseQueryResult } from '@tanstack/react-query';
import { colors, spacing, fontStyles, fonts } from '@/constants/theme';
import Ionicons from '@expo/vector-icons/Ionicons';
import { journalQueryKeys } from '@/queries/journalQueries';
import { fetchJournalsByDateRange } from '@/apis/journalApi';
import { Journal, Emotion } from '@/types/journal';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/utils/dateUtils';
import { RootStackParamList } from '@/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { hasJournalForDate, findJournalForDate, getTodayString } from '@/utils/journalUtils';
import AlertModal from '@/components/common/AlertModal';
import Toast from 'react-native-toast-message';

LocaleConfig.locales['ko'] = {
  monthNames: [
    '1월',
    '2월',
    '3월',
    '4월',
    '5월',
    '6월',
    '7월',
    '8월',
    '9월',
    '10월',
    '11월',
    '12월',
  ],
  monthNamesShort: ['1.', '2.', '3.', '4.', '5.', '6.', '7.', '8.', '9.', '10.', '11.', '12.'],
  dayNames: ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'],
  dayNamesShort: ['일', '월', '화', '수', '목', '금', '토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

interface CustomDayMarking {
  selected?: boolean;
  selectedColor?: string;
  customStyles?: {
    text?: object;
  };
  isToday?: boolean;
}

interface MarkedDatesType {
  [key: string]: CustomDayMarking;
}

const MIN_CALENDAR_HEIGHT = 420; // 최소 높이 약간 증가 (6주 * 70px 가정)

const JournalCalendarScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const todayString = getTodayString();
  const userId = useAuthStore((state) => state.session?.user?.id);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  // 현재 표시 월 기준 앞뒤 3개월 (총 7개월) 범위 계산
  const monthsToQuery = useMemo(() => {
    const year = currentDisplayMonth.getFullYear();
    const month = currentDisplayMonth.getMonth();
    const months = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(year, month + i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
    }
    return months;
  }, [currentDisplayMonth]);

  // useQueries를 사용하여 여러 월의 데이터 페칭
  const journalQueriesResults = useQueries({
    queries: monthsToQuery.map(({ year, month }) => ({
      queryKey: journalQueryKeys.monthlyList(year, month, userId),
      queryFn: () => {
        if (!userId) return Promise.resolve([]);
        const startDate = formatDate(new Date(year, month - 1, 1));
        const endDate = formatDate(new Date(year, month, 0));
        return fetchJournalsByDateRange(startDate, endDate, userId);
      },
      enabled: !!userId,
      staleTime: 1000 * 60 * 60,
      placeholderData: keepPreviousData,
    })),
  });

  // 모든 페칭된 저널 데이터 통합
  const allFetchedJournals = useMemo(() => {
    return journalQueriesResults.reduce((acc, queryResult) => {
      if (queryResult.data) {
        acc.push(...queryResult.data);
      }
      return acc;
    }, [] as Journal[]);
  }, [journalQueriesResults]);

  // 현재 "보이는" 달의 쿼리 찾기 및 로딩/에러 상태 결정
  const currentCalendarYear = currentDisplayMonth.getFullYear();
  const currentCalendarMonthValue = currentDisplayMonth.getMonth() + 1; // 1-12

  // 현재 보이는 달의 쿼리 결과 찾기 (인덱스 기반)
  const currentMonthQueryIndex = useMemo(
    () =>
      monthsToQuery.findIndex(
        (m) => m.year === currentCalendarYear && m.month === currentCalendarMonthValue
      ),
    [monthsToQuery, currentCalendarYear, currentCalendarMonthValue]
  );

  const currentMonthQuery: UseQueryResult<Journal[], Error> | undefined =
    currentMonthQueryIndex !== -1 ? journalQueriesResults[currentMonthQueryIndex] : undefined;

  const isLoadingCurrentMonthData = currentMonthQuery?.isLoading && !currentMonthQuery?.data; // 초기 로딩 시에만
  const isErrorCurrentMonthData = currentMonthQuery?.isError;
  const currentMonthError = currentMonthQuery?.error;

  const showAlert = (title: string, message: string) => {
    setAlertModal({ visible: true, title, message });
  };

  const hideAlert = () => {
    setAlertModal({ visible: false, title: '', message: '' });
  };

  const handleFabPress = () => {
    // 오늘 날짜에 이미 일기가 있는지 확인
    if (hasJournalForDate(allFetchedJournals, todayString)) {
      showAlert(
        '일기 작성 제한',
        '오늘은 이미 일기를 작성했습니다.\n다른 날의 일기를 작성하려면 캘린더에서 빈 날짜를 선택해주세요.'
      );
      return;
    }

    // 오늘 날짜에 일기가 없으면 일기 작성으로 이동
    navigation.navigate('SelectJournalMode', {});
  };

  // onDayPress 함수 수정
  const onDayPress = (day: DateData) => {
    console.log('selected day', day);

    const selectedDateString = day.dateString;
    const existingJournal = findJournalForDate(allFetchedJournals, selectedDateString);

    if (existingJournal) {
      // 이미 일기가 있는 날짜를 클릭한 경우 - 상세 보기로 이동
      navigation.navigate('JournalDetail', { journalId: existingJournal.id });
    } else {
      // 일기가 없는 날짜를 클릭한 경우 - 해당 날짜로 일기 작성
      // 선택한 날짜로 일기 작성 화면으로 이동
      navigation.navigate('SelectJournalMode', { selectedDate: selectedDateString });
    }
  };

  // API 데이터를 기반으로 markedDates 생성 (useMemo 사용)
  const markedDates = useMemo((): MarkedDatesType => {
    const marked: MarkedDatesType = {};

    marked[todayString] = {
      isToday: true,
      customStyles: {
        text: {
          color: colors.white,
          backgroundColor: colors.primary.DEFAULT,
          paddingHorizontal: spacing[2],
          borderRadius: spacing[3],
          fontFamily: fonts.bold,
          fontSize: fontStyles['sm-normal'].fontSize,
          overflow: 'hidden',
        },
      },
    };

    // API에서 받아온 영성일기 데이터로 마킹
    allFetchedJournals.forEach((journal: Journal) => {
      if (journal.date) {
        const journalDateString = journal.date;
        if (journalDateString !== todayString) {
          marked[journalDateString] = {};
        } else {
          marked[todayString] = {
            ...marked[todayString],
          };
        }
      }
    });
    return marked;
  }, [allFetchedJournals, todayString]);

  const renderCustomHeader = (date: any) => {
    const headerDate = new Date(date);
    const year = headerDate.getFullYear();
    const month = headerDate.getMonth() + 1;

    return (
      <View style={styles.customHeaderMainContainer}>
        <Text style={styles.customHeaderYearText}>{year}</Text>
        <View style={styles.monthRowContainer}>
          <Text style={styles.customHeaderMonthText}>{month}월</Text>
        </View>
      </View>
    );
  };

  const renderArrow = (direction: 'left' | 'right') => {
    return (
      <Ionicons
        name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
        size={22}
        color={colors['grey-03']}
      />
    );
  };

  // Figma 디자인에 최대한 맞춘 dayComponent
  const dayComponent = ({
    date,
    state,
    marking,
  }: {
    date?: DateData;
    state?: string;
    marking?: CustomDayMarking;
  }) => {
    if (!date) return null;

    const dayNumber = date.day;
    const isToday = marking?.isToday || false;
    let textStyle: any = styles.dayText;

    if (isToday && marking?.customStyles?.text) {
      textStyle = [textStyle, marking.customStyles.text];
    }
    if (state === 'disabled') {
      textStyle = Array.isArray(textStyle)
        ? [...textStyle, styles.disabledText]
        : [textStyle, styles.disabledText];
    }

    // allFetchedJournals에서 해당 날짜의 저널 찾기
    const journalEntryForDay = allFetchedJournals?.find((j) => j.date === date?.dateString);
    const emotionForDay = journalEntryForDay?.emotion;

    const renderEmotionIcon = (emotionData: Emotion) => {
      if (!emotionData || !emotionData.img_url) {
        return null;
      }
      return (
        <Image
          source={{ uri: emotionData.img_url }}
          style={styles.emotionImage}
          resizeMode="contain"
        />
      );
    };

    const renderPlaceholderCircle = () => {
      return <View style={styles.placeholderCircle} />;
    };

    const renderTodayBlueCircle = () => {
      return <View style={styles.todayBlueCircle} />;
    };

    return (
      <TouchableOpacity
        onPress={() => onDayPress(date!)}
        style={styles.dayContainer}
        disabled={state === 'disabled'}>
        <Text style={textStyle}>{dayNumber}</Text>

        <View style={styles.iconContainer}>
          {isToday && (
            <>
              {renderTodayBlueCircle()}
              {emotionForDay?.img_url && (
                <View style={StyleSheet.absoluteFillObject}>
                  {renderEmotionIcon(emotionForDay)}
                </View>
              )}
            </>
          )}
          {!isToday &&
            journalEntryForDay &&
            emotionForDay?.img_url &&
            renderEmotionIcon(emotionForDay)}
          {!isToday && !journalEntryForDay && renderPlaceholderCircle()}
        </View>
      </TouchableOpacity>
    );
  };

  // 새로고침 함수
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // 모든 쿼리 refetch
      await Promise.all(journalQueriesResults.map((query) => query.refetch()));
    } catch (error) {
      console.error('새로고침 중 오류 발생:', error);
      Toast.show({
        type: 'error',
        text1: '새로고침 실패',
        text2: '데이터를 불러오는 중 오류가 발생했습니다.',
        visibilityTime: 2000,
      });
    } finally {
      setRefreshing(false);
    }
  };

  // 초기 로딩 시에만 전체 화면 로딩 인디케이터 표시
  if (isLoadingCurrentMonthData) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </View>
    );
  }

  if (isErrorCurrentMonthData) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>오류가 발생했습니다: {currentMonthError?.message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary.DEFAULT}
            colors={[colors.primary.DEFAULT]}
          />
        }
        showsVerticalScrollIndicator={false}>
        <Calendar
          current={currentDisplayMonth.toISOString().split('T')[0]}
          markingType={'custom'}
          markedDates={markedDates}
          onMonthChange={(date) => {
            // isFetching 조건 없이 월 변경
            setCurrentDisplayMonth(new Date(date.timestamp));
          }}
          hideExtraDays={true}
          renderArrow={renderArrow}
          dayComponent={dayComponent}
          renderHeader={renderCustomHeader}
          theme={{
            backgroundColor: colors.white,
            calendarBackground: colors.white,
            textSectionTitleColor: colors['grey-01'],
            dayTextColor: colors['grey-01'],
            textDisabledColor: colors['light-grey-02'],
            arrowColor: colors['grey-03'],
            textDayFontFamily: fonts.regular,
            textMonthFontFamily: fonts.semiBold,
            textDayHeaderFontFamily: fonts.regular,
            textDayFontSize: fontStyles['sm-normal'].fontSize,
            textMonthFontSize: fontStyles['xl-tight'].fontSize,
            textDayHeaderFontSize: fontStyles['xs-normal'].fontSize,
            weekVerticalMargin: spacing[1.5],
          }}
          style={[styles.calendar, { minHeight: MIN_CALENDAR_HEIGHT }]}
        />
      </ScrollView>
      {/* FAB */}
      <TouchableOpacity style={styles.fabContainer} onPress={handleFabPress}>
        <Ionicons name="create-outline" size={30} color={colors.primary.DEFAULT} />
      </TouchableOpacity>
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
    paddingHorizontal: spacing[4],
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
  },
  customHeaderMainContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingLeft: spacing[2],
    paddingVertical: spacing[2],
    marginBottom: spacing[2],
  },
  monthRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customHeaderYearText: {
    fontFamily: fonts.semiBold,
    fontSize: fontStyles['sm-normal'].fontSize,
    color: colors['grey-04'],
    lineHeight: fontStyles['sm-normal'].lineHeight,
  },
  customHeaderMonthText: {
    fontFamily: fonts.semiBold,
    fontSize: fontStyles['2xl-tight'].fontSize,
    color: colors['dark-grey-02'],
    letterSpacing: fontStyles['2xl-tight'].letterSpacing,
    lineHeight: fontStyles['2xl-tight'].lineHeight,
  },
  headerSpinner: {
    marginLeft: spacing[2],
  },
  calendar: {
    // 캘린더 자체에는 그림자나 특별한 테두리가 없음 (Figma 확인)
  },
  dayContainer: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing[2],
    marginBottom: spacing[1],
  },
  dayText: {
    ...fontStyles['base-normal'],
    color: colors['grey-01'],
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  disabledText: {
    color: colors['light-grey-02'],
  },
  emotionImage: {
    width: 40,
    height: 40,
  },
  placeholderCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors['light-grey-01'],
  },
  todayBlueCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary.light,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
  errorText: {
    color: colors.secondary.DEFAULT,
    ...fontStyles['base-normal'],
  },

  fabContainer: {
    position: 'absolute',
    bottom: spacing[4],
    right: spacing[4],
    backgroundColor: colors.primary.light,
    padding: spacing[2],
    borderRadius: 20,
  },
  fabText: {
    ...fontStyles['base-normal'],
    color: colors.primary.DEFAULT,
  },
});

export default JournalCalendarScreen;
