import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Image } from 'react-native';
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

// react-native-calendars 한글 설정 (필요시)
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

// CustomMarking 타입을 CalendarProps['markedDates'] 내부 타입을 활용하여 정의 시도
// 또는 라이브러리가 제공하는 정확한 마킹 타입으로 대체 필요.
// 우선 간단하게 selected, selectedColor, customStyles만 있는 형태로 정의
interface CustomDayMarking {
  selected?: boolean;
  selectedColor?: string;
  // dotColor?: string; // markingType='dot' 또는 'multi-dot' 일 때 사용
  // marked?: boolean; // markingType='dot' 또는 'multi-dot' 일 때 사용
  customStyles?: {
    text?: object;
  };
  // emotionId는 더 이상 직접 사용하지 않으므로 삭제 또는 주석 처리 가능
  // emotionId?: string;
  isToday?: boolean;
  // 다른 필요한 마킹 속성들...
}

interface MarkedDatesType {
  [key: string]: CustomDayMarking;
}

const MIN_CALENDAR_HEIGHT = 420; // 최소 높이 약간 증가 (6주 * 70px 가정)

const JournalCalendarScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [currentDisplayMonth, setCurrentDisplayMonth] = useState(new Date());
  const todayString = new Date().toISOString().split('T')[0];
  const userId = useAuthStore((state) => state.session?.user?.id);

  // 현재 표시 월 기준 앞뒤 3개월 (총 7개월) 범위 계산
  const monthsToQuery = useMemo(() => {
    const year = currentDisplayMonth.getFullYear();
    const month = currentDisplayMonth.getMonth(); // 0-11
    const months = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(year, month + i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1 }); // month는 1-12
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
      staleTime: 1000 * 60 * 60, // 1 hour
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

  const onDayPress = (day: DateData) => {
    console.log('selected day', day);
    const journalForDay = allFetchedJournals.find((j) => j.date === day.dateString);
    if (journalForDay) {
      navigation.navigate('JournalDetail', { journalId: journalForDay.id });
    } else {
      console.log('No journal for this day, navigate to create new or show message');
    }
  };

  // API 데이터를 기반으로 markedDates 생성 (useMemo 사용)
  const markedDates = useMemo((): MarkedDatesType => {
    const marked: MarkedDatesType = {};

    // 오늘 날짜 표시
    marked[todayString] = {
      isToday: true,
      customStyles: {
        text: {
          color: colors.white,
          backgroundColor: colors.primary.DEFAULT,
          paddingVertical: spacing[0.5],
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

  // Figma 헤더 스타일 반영 (renderHeader 사용)
  const renderCustomHeader = (date: any) => {
    const headerDate = new Date(date);
    const year = headerDate.getFullYear();
    const month = headerDate.getMonth() + 1;

    return (
      <View style={styles.customHeaderMainContainer}>
        <Text style={styles.customHeaderYearText}>{year}</Text>
        <View style={styles.monthRowContainer}>
          <Text style={styles.customHeaderMonthText}>{month}월</Text>
          {/* {isFetching && (
            <ActivityIndicator
              size="small"
              color={colors.primary.DEFAULT}
              style={styles.headerSpinner}
            />
          )} */}
        </View>
      </View>
    );
  };

  // renderArrow 함수 복원
  const renderArrow = (direction: 'left' | 'right') => {
    return (
      <Ionicons
        name={direction === 'left' ? 'chevron-back' : 'chevron-forward'}
        size={22} // Figma 아이콘 크기 (22x22)
        color={colors['grey-03']} // Figma 아이콘 색상 (#6F6F6F)
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
        style={[styles.calendar, { flex: 1, minHeight: MIN_CALENDAR_HEIGHT }]}
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
  customHeaderMainContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingLeft: spacing[2],
    paddingVertical: spacing[2],
  },
  monthRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[0.5],
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
    width: 49,
    height: 70,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: spacing[2],
  },
  dayText: {
    fontFamily: fonts.regular,
    fontSize: fontStyles['sm-normal'].fontSize,
    color: colors['grey-01'],
    marginBottom: spacing[1.5],
    textAlign: 'center',
  },
  disabledText: {
    color: colors['light-grey-02'],
  },
  emotionImage: {
    width: 36,
    height: 36,
  },
  placeholderCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors['light-grey-01'],
  },
  todayBlueCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary.light,
  },
  iconContainer: {
    width: 36,
    height: 36,
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
    // 에러 메시지용 스타일
    color: colors.secondary.DEFAULT,
    fontSize: fontStyles['base-normal'].fontSize,
    fontFamily: fonts.medium,
  },
});

export default JournalCalendarScreen;
