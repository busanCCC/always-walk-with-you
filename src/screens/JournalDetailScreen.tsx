import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, fonts, fontStyles } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/types';
import { useJournalDetailQuery } from '@/queries/journalQueries'; // 새로 추가될 훅
import { SafeAreaView } from 'react-native-safe-area-context';

type JournalDetailScreenRouteProp = RouteProp<RootStackParamList, 'JournalDetail'>;

const JournalDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<JournalDetailScreenRouteProp>();
  const journalId = route.params?.journalId; // journalId를 받음

  const { data: journal, isLoading, isError, error } = useJournalDetailQuery(journalId || '');

  useEffect(() => {
    if (journal) {
    }
  }, [journal, navigation]);

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

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear().toString().slice(-2)}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`;
  };

  const getDayOfWeek = (dateString: string) => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const date = new Date(dateString);
    return days[date.getDay()];
  };

  const handleMoreOptions = () => {
    console.log('More options for journal:', journal.id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navigationBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
          <Ionicons name="arrow-back" size={24} color={colors.black} />
        </TouchableOpacity>
        <View style={styles.navTitleContainer} />
        <TouchableOpacity onPress={handleMoreOptions} style={styles.navButton}>
          <Ionicons name="ellipsis-vertical" size={22} color={colors.black} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContentContainer}>
        <View style={styles.journalHeaderContainer}>
          <View style={styles.dateAndAuthorContainer}>
            <Text style={styles.dateText}>{formatDateDisplay(journal.date)}</Text>
            <Text style={styles.dayAuthorText}>{getDayOfWeek(journal.date)}</Text>
          </View>
          {journal.emotion?.img_url && (
            <Image source={{ uri: journal.emotion.img_url }} style={styles.emotionIcon} />
          )}
        </View>

        <View style={styles.separator} />

        <Text style={styles.journalContentText}>{journal.content}</Text>
      </ScrollView>

      <View style={styles.bottomActionsContainer}>
        <View style={styles.actionItem}>
          <Ionicons name="chatbubble-outline" size={20} color={colors['grey-02']} />
          <Text style={styles.actionText}>댓글(0)</Text>
        </View>
        <View style={styles.actionItem}>
          <Ionicons name="heart-outline" size={20} color={colors['grey-02']} />
          <Text style={styles.actionText}>좋아요</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  centered: {
    // 로딩 및 에러 시 중앙 정렬을 위한 스타일
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: colors.secondary.DEFAULT,
    fontSize: fontStyles['base-normal']?.fontSize || 16,
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
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  journalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: spacing[5],
    marginBottom: spacing[4],
  },
  dateAndAuthorContainer: {},
  dateText: {
    fontFamily: fonts.semiBold,
    fontSize: fontStyles['base-tight']?.fontSize || 16, // 'base-tight'로 수정
    color: colors.black,
    lineHeight: fontStyles['base-tight']?.lineHeight || 24, // 'base-tight'로 수정
  },
  dayAuthorText: {
    fontFamily: fonts.semiBold,
    fontSize: fontStyles['xs-normal']?.fontSize || 12,
    color: colors['grey-02'],
    lineHeight: fontStyles['xs-normal']?.lineHeight || 18,
    marginTop: spacing[1],
  },
  emotionIcon: {
    width: 40,
    height: 40,
  },
  separator: {
    height: 2,
    backgroundColor: colors['light-grey-01'],
    marginVertical: spacing[4],
  },
  journalContentText: {
    fontFamily: fonts.regular,
    fontSize: fontStyles['sm-normal']?.fontSize || 14, // Figma 14px Regular -> sm-normal
    color: colors.black,
    lineHeight: fontStyles['sm-normal']?.lineHeight || 21,
  },
  bottomActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors['light-grey-01'],
    backgroundColor: colors.white,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing[4],
  },
  actionText: {
    fontFamily: fonts.regular,
    fontSize: fontStyles['xs-normal']?.fontSize || 12,
    color: colors['grey-01'],
    marginLeft: spacing[1],
  },
});

export default JournalDetailScreen;
