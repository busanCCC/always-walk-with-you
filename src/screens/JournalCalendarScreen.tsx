import React, { useState, useMemo, useEffect } from 'react';
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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { localJournalApi } from '@/apis/localJournalApiDrizzle';
import { getLocalEmotions } from '@/utils/emotionStorage';
import { Journal, Emotion } from '@/types/journal';
import { useAuthStore } from '@/store/authStore';
import { formatDate } from '@/utils/dateUtils';
import { RootStackParamList } from '@/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { hasJournalForDate, findJournalForDate, getTodayString } from '@/utils/journalUtils';
import AlertModal from '@/components/common/AlertModal';
import Toast from 'react-native-toast-message';
import { supabase } from '@/utils/supabaseClient';
import { networkManager, useNetwork } from '@/utils/networkManager';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  // 네트워크 상태 감지
  const { isOnline } = useNetwork();

  // 앱 시작 시 및 네트워크 연결 시 자동 동기화
  useEffect(() => {
    if (userId) {
      console.log('🔄 앱 시작 시 캐시 무효화 및 동기화 시작');

      // 모든 캐시 강제 무효화 및 새로고침
      queryClient.clear(); // 모든 캐시 완전 삭제

      // 쿼리들 다시 실행
      queryClient.invalidateQueries({ queryKey: ['localJournals'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['emotions'] });
      queryClient.invalidateQueries({ queryKey: ['groupJournals'] });

      if (isOnline) {
        console.log('🌐 네트워크 연결됨 - 자동 동기화 시작');
        syncWithServer();
      }
    }
  }, [isOnline, userId]);

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

  // 🗄️ 로컬 DB 기반 여러 월의 데이터 페칭
  const journalQueriesResults = useQueries({
    queries: monthsToQuery.map(({ year, month }) => ({
      queryKey: ['localJournals', 'monthly', year, month, userId],
      queryFn: async () => {
        if (!userId) return [];

        try {
          const startDate = formatDate(new Date(year, month - 1, 1));
          const endDate = formatDate(new Date(year, month, 0));

          // 1. 로컬 DB에서 월간 일기 가져오기
          const localJournals = await localJournalApi.getJournalsWithDetailsByDateRange(
            userId,
            startDate,
            endDate
          );

          // 2. 감정 데이터 가져오기 (캐시된 데이터 사용)
          const emotions = await getLocalEmotions();
          const emotionsMap = new Map(emotions.map((e) => [e.id, e]));

          // 3. 로컬 일기를 Journal 형태로 변환하면서 감정 정보 추가
          const journals: Journal[] = localJournals.map((localJournal) => {
            const emotion = localJournal.emotionId ? emotionsMap.get(localJournal.emotionId) : null;

            return {
              id: localJournal.localId, // 항상 로컬 ID 사용
              user_id: localJournal.userId,
              date: localJournal.date,
              mode: localJournal.mode,
              emotion_id: localJournal.emotionId,
              shared_groups: localJournal.sharedGroups ? JSON.parse(localJournal.sharedGroups) : [],
              created_at: localJournal.createdLocallyAt,
              updated_at: localJournal.lastModifiedAt,
              emotion: emotion
                ? {
                    id: emotion.id,
                    name: emotion.name,
                    img_url: emotion.local_img_path || emotion.img_url,
                    description: emotion.description,
                    created_at: emotion.created_at,
                    updated_at: emotion.updated_at,
                  }
                : null,
              journal_entries:
                localJournal.entries?.map((entry: any) => ({
                  id: entry.localId || entry.id, // 항상 로컬 ID 사용
                  journal_id: entry.localJournalId || entry.journal_id, // 항상 로컬 ID 사용
                  entry_type: entry.entryType || entry.entry_type,
                  text_content: entry.textContent || entry.text_content,
                  entry_order: entry.entryOrder || entry.entry_order,
                  created_at: entry.createdAt || entry.created_at,
                  updated_at: entry.updatedAt || entry.updated_at,
                })) || [],
              user: null,
            };
          });

          return journals;
        } catch (error) {
          console.error(`Failed to fetch local journals for ${year}-${month}:`, error);
          return [];
        }
      },
      enabled: !!userId,
      staleTime: 1000 * 30, // 30초 캐시 (삭제된 일기 빠르게 반영)
      placeholderData: keepPreviousData,
      refetchOnMount: true,
      refetchOnWindowFocus: true, // 포커스 시 새로고침
    })),
  });

  // 모든 페칭된 일기 데이터 통합
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

  const onDayPress = (day: DateData) => {
    const selectedDateString = day.dateString;
    const existingJournal = findJournalForDate(allFetchedJournals, selectedDateString);

    if (existingJournal) {
      // 이미 일기가 있는 날짜를 클릭한 경우 - 상세 보기로 이동
      // ID가 로컬 ID인지 확인하고, 서버 ID인 경우 로컬에서 찾기
      let journalId = existingJournal.id;

      // 서버 ID인 경우 로컬에서 해당 저널 찾기
      if (journalId && !journalId.startsWith('local_') && !journalId.startsWith('server_')) {
        console.log(`🔍 서버 ID로 전달된 저널: ${journalId}, 로컬에서 찾기 시도...`);
        // 로컬 DB에서 해당 날짜의 저널 찾기
        const userId = useAuthStore.getState().session?.user?.id;
        if (userId) {
          localJournalApi
            .getJournalByDate(userId, selectedDateString)
            .then((localJournal) => {
              if (localJournal) {
                console.log(`✅ 로컬 저널 찾음: ${localJournal.localId}`);
                navigation.navigate('JournalDetail', { journalId: localJournal.localId });
              } else {
                console.log(`❌ 로컬에서 저널을 찾을 수 없음: ${journalId}`);
                showAlert('오류', '해당 일기를 찾을 수 없습니다.');
              }
            })
            .catch((error) => {
              console.error('로컬 저널 조회 실패:', error);
              showAlert('오류', '일기 정보를 불러올 수 없습니다.');
            });
        } else {
          showAlert('오류', '사용자 정보를 찾을 수 없습니다.');
        }
        return;
      }

      navigation.navigate('JournalDetail', { journalId });
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

    // allFetchedJournals에서 해당 날짜의 일기 찾기
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
      // 1. 로컬 DB 정리: 존재하지 않는 저널 제거
      console.log('🧹 로컬 DB 정리 중...');
      await cleanupLocalDatabase();

      // 2. 서버와 동기화 (온라인인 경우)
      if (networkManager.isOnline()) {
        console.log('🔄 서버와 동기화 중...');
        await syncWithServer();
      }

      // 3. 캐시 무효화하여 새로고침
      queryClient.invalidateQueries({ queryKey: ['localJournals'] });
      queryClient.invalidateQueries({ queryKey: ['emotions'] });

      Toast.show({
        type: 'success',
        text1: '새로고침 완료',
        text2: '데이터가 업데이트되었습니다.',
        position: 'bottom',
      });
    } catch (error) {
      console.error('새로고침 중 오류:', error);
      Toast.show({
        type: 'error',
        text1: '새로고침 실패',
        text2: '잠시 후 다시 시도해주세요.',
        position: 'bottom',
      });
    } finally {
      setRefreshing(false);
    }
  };

  // 로컬 DB 정리 함수
  const cleanupLocalDatabase = async () => {
    if (!userId) return;

    try {
      // 로컬 DB에서 실제로 존재하는 저널만 확인
      const allLocalJournals = await localJournalApi.getJournalsWithDetailsByDateRange(
        userId,
        '2020-01-01', // 충분히 과거 날짜
        '2030-12-31' // 충분히 미래 날짜
      );

      console.log(`📊 로컬 DB에 ${allLocalJournals.length}개의 저널이 존재합니다.`);

      // 1. 잘못된 서버 ID를 가진 저널들 정리
      const invalidServerIdJournals = allLocalJournals.filter(
        (journal) =>
          journal.serverId && (!journal.sharedGroups || journal.sharedGroups.length === 0)
      );

      if (invalidServerIdJournals.length > 0) {
        console.log(
          `🗑️ ${invalidServerIdJournals.length}개의 잘못된 서버 ID를 가진 저널 정리 중...`
        );

        for (const journal of invalidServerIdJournals) {
          try {
            // 서버에서 해당 저널이 실제로 존재하는지 확인
            const { data: serverJournal, error } = await supabase
              .from('journals')
              .select('id')
              .eq('id', journal.serverId)
              .single();

            if (error || !serverJournal) {
              // 서버에 존재하지 않는 저널 - serverId 제거
              console.log(
                `🗑️ 서버에 존재하지 않는 저널 발견: ${journal.localId} (serverId: ${journal.serverId})`
              );
              await localJournalApi.updateSyncStatus(journal.localId, 'local', undefined, {
                serverDeleted: true,
                deletedAt: new Date().toISOString(),
                reason: '서버에서 삭제됨',
              });
            }
          } catch (error) {
            console.error(`❌ 저널 ${journal.localId} 서버 상태 확인 실패:`, error);
          }
        }
      }

      // 2. 캘린더에 표시되는 저널 중 로컬에 없는 것들 필터링
      const validJournals = allFetchedJournals.filter((journal) =>
        allLocalJournals.some((localJournal) => localJournal.localId === journal.id)
      );

      if (validJournals.length !== allFetchedJournals.length) {
        console.log(
          `⚠️ 캘린더에서 ${allFetchedJournals.length - validJournals.length}개의 잘못된 저널이 제거됩니다.`
        );
      }
    } catch (error) {
      console.error('로컬 DB 정리 중 오류:', error);
    }
  };

  // 서버와 동기화 함수
  const syncWithServer = async () => {
    if (!userId || !networkManager.isOnline()) return;

    try {
      console.log('🔄 서버와 동기화 시작...');

      // 1. 로컬의 공유된 저널들 가져오기
      const localSharedJournals = await localJournalApi.getJournalsWithDetailsByDateRange(
        userId,
        '2020-01-01',
        '2030-12-31'
      );

      const sharedJournals = localSharedJournals.filter(
        (journal) => journal.serverId && journal.sharedGroups && journal.sharedGroups.length > 0
      );

      console.log(`📊 로컬에 ${sharedJournals.length}개의 공유 저널이 있습니다.`);

      // 2. 각 공유 저널의 서버 상태 확인
      for (const localJournal of sharedJournals) {
        try {
          const { data: serverJournal, error } = await supabase
            .from('journals')
            .select('id, shared_groups')
            .eq('id', localJournal.serverId)
            .single();

          if (error || !serverJournal) {
            // 서버에서 삭제된 저널 - 로컬에서 공유 해제
            console.log(
              `🗑️ 서버에서 삭제된 저널 발견: ${localJournal.localId} (serverId: ${localJournal.serverId})`
            );

            await localJournalApi.updateSyncStatus(
              localJournal.localId,
              'local',
              undefined, // serverId 제거
              {
                serverDeleted: true,
                deletedAt: new Date().toISOString(),
                reason: '서버에서 삭제됨',
              }
            );

            // 공유 그룹 정보도 제거
            await localJournalApi.updateJournal(localJournal.localId, {
              shared_groups: [],
            });

            console.log(`✅ 저널 공유 해제 완료: ${localJournal.localId}`);
          } else {
            // 서버에 존재하는 경우 - 공유 그룹 정보 동기화
            const serverGroups = serverJournal.shared_groups || [];
            const localGroups = localJournal.sharedGroups
              ? JSON.parse(localJournal.sharedGroups)
              : [];

            if (JSON.stringify(serverGroups) !== JSON.stringify(localGroups)) {
              console.log(`🔄 공유 그룹 정보 동기화: ${localJournal.localId}`);
              await localJournalApi.updateJournal(localJournal.localId, {
                shared_groups: serverGroups,
              });
            }
          }
        } catch (error) {
          console.error(`❌ 저널 ${localJournal.localId} 서버 상태 확인 실패:`, error);
        }
      }

      // 3. 서버에서 공유된 저널 중 로컬에 없는 것들 확인
      const { data: serverJournals } = await supabase
        .from('journals')
        .select('*')
        .eq('user_id', userId)
        .not('shared_groups', 'is', null);

      if (serverJournals) {
        for (const serverJournal of serverJournals) {
          const exists = await localJournalApi.checkJournalExistsForDate(
            userId,
            serverJournal.date
          );
          if (!exists) {
            console.log(`📥 서버 저널을 로컬에 추가: ${serverJournal.date}`);
            // 서버 저널을 로컬에 복사하는 로직
            await copyServerJournalToLocal(serverJournal);
          }
        }
      }

      console.log('✅ 서버 동기화 완료');
    } catch (error) {
      console.error('❌ 서버 동기화 중 오류:', error);
    }
  };

  // 서버 저널을 로컬에 복사하는 함수
  const copyServerJournalToLocal = async (serverJournal: any) => {
    try {
      // 서버 저널의 상세 정보 가져오기
      const { data: journalEntries } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('journal_id', serverJournal.id)
        .order('entry_order');

      // 로컬에 저널 생성
      const localJournalData = {
        user_id: serverJournal.user_id,
        date: serverJournal.date,
        mode: serverJournal.mode,
        emotion_id: serverJournal.emotion_id,
        shared_groups: serverJournal.shared_groups || [],
        content: journalEntries?.find((e) => e.entry_type === 'general')?.text_content || '',
        answers:
          journalEntries
            ?.filter((e) => e.entry_type === 'answer')
            .map((e) => ({ answer: e.text_content || '', order: e.entry_order })) || [],
      };

      const createdJournal = await localJournalApi.createJournal(localJournalData);

      // 서버 ID 연결
      await localJournalApi.updateSyncStatus(createdJournal.localId, 'synced', serverJournal.id);

      console.log(`✅ 서버 저널 로컬 복사 완료: ${createdJournal.localId}`);
    } catch (error) {
      console.error('❌ 서버 저널 로컬 복사 실패:', error);
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
        <MaterialIcons name="create" size={24} color={colors.primary.DEFAULT} />
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
    width: 44,
    height: 44,
  },
  placeholderCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors['light-grey-01'],
  },
  todayBlueCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.light,
  },
  iconContainer: {
    width: 44,
    height: 44,
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
    borderRadius: 36,
  },
  fabText: {
    ...fontStyles['base-normal'],
    color: colors.primary.DEFAULT,
  },
});

export default JournalCalendarScreen;
