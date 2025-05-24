import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, fontStyles, spacing } from '@/constants/theme';
import { Emotion } from '@/types/journal';

interface JournalHeaderProps {
  date?: Date;
  emotion?: Emotion | null;
  showEmptyEmotion?: boolean; // 비어있는 감정 아이콘 표시 여부
  onEmotionPress?: () => void; // 감정 아이콘 클릭 핸들러
  defaultEmotion?: Emotion; // 기본 감정 (행복)
}

const JournalHeader: React.FC<JournalHeaderProps> = ({
  date = new Date(),
  emotion,
  showEmptyEmotion = false,
  onEmotionPress,
  defaultEmotion,
}) => {
  const formatDate = (date: Date) => {
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    return days[date.getDay()];
  };

  const renderEmotionIcon = () => {
    // 기본 행복 감정 데이터
    const happyEmotion = defaultEmotion || {
      id: 'default-happy',
      name: '행복',
      img_url: '',
      description: '기분 좋았어요',
      created_at: '',
      updated_at: '',
    };

    // 실제 선택된 감정이 있으면 그것을 사용, 없으면 기본 행복 감정 사용
    const displayEmotion = emotion || happyEmotion;

    if (showEmptyEmotion && !emotion) {
      return (
        <TouchableOpacity
          style={styles.emotionContainer}
          onPress={onEmotionPress}
          activeOpacity={0.7}>
          <View style={[styles.emotionIcon, styles.emptyEmotionIcon]} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={styles.emotionContainer}
        onPress={onEmotionPress}
        activeOpacity={0.7}>
        <View style={styles.emotionIcon}>
          {displayEmotion.img_url ? (
            <Image source={{ uri: displayEmotion.img_url }} style={styles.emotionImage} />
          ) : (
            <Text style={styles.emotionText}>{displayEmotion.name.charAt(0)}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.dateContainer}>
        <Text style={styles.dateText}>{formatDate(date)}</Text>
        <Text style={styles.dayText}>{getDayOfWeek(date)}</Text>
      </View>
      {renderEmotionIcon()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    borderBottomColor: colors['light-grey-02'],
  },
  dateContainer: {
    flex: 1,
  },
  dateText: {
    ...fontStyles['lg-tight'],
    color: colors['dark-grey-02'],
  },
  dayText: {
    ...fontStyles['sm-normal'],
    color: colors['grey-02'],
  },
  emotionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEmotionIcon: {
    backgroundColor: colors['light-grey-01'],
  },
  emotionImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  emotionText: {
    fontSize: 24,
  },
});

export default JournalHeader;
