import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Journal } from '@/types/journal';
import { colors, spacing, fontStyles } from '@/constants/theme';
import { getUserDisplayName } from '@/utils/roleMapper';
import Ionicons from '@expo/vector-icons/Ionicons';

interface GroupJournalCardProps {
  journal: Journal;
  onPress?: () => void;
}

const GroupJournalCard: React.FC<GroupJournalCardProps> = ({ journal, onPress }) => {
  const [imageLoadError, setImageLoadError] = useState(false);

  // 작성자 이름과 역할 가져오기
  const authorDisplayName = getUserDisplayName(
    journal.user?.name,
    journal.user?.email,
    undefined, // role 필드 없음
    journal.user?.is_admin
  );

  // 일기 내용 (첫 번째 entry의 텍스트)
  const content = journal.journal_entries?.[0]?.text_content || '';

  // 날짜 포맷팅 (예: "05 수")
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${day} ${weekday}`;
  };

  // 감정 표시 컴포넌트
  const renderEmotion = () => {
    const hasImageUrl = journal.emotion?.img_url && !imageLoadError;

    if (hasImageUrl) {
      return (
        <Image
          source={{ uri: journal.emotion!.img_url }}
          style={styles.emotionImage}
          onError={() => setImageLoadError(true)}
          resizeMode="contain"
        />
      );
    }

    return <Text style={styles.emotionText}>{journal.emotion?.name}</Text>;
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* 왼쪽 감정 아이콘 영역 */}
      <View style={styles.leftSection}>
        <View style={styles.leftTopSection}>
          <View style={styles.emotionContainer}>{renderEmotion()}</View>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{formatDate(journal.date)}</Text>
          </View>
        </View>

        <View style={styles.leftBottomSection}>
          <View style={styles.actionGroup}>
            <Ionicons name="heart-outline" size={12} color={colors['grey-02']} />
            <Text style={styles.actionText}>0</Text>
          </View>

          <View style={styles.actionGroup}>
            <Ionicons name="chatbubble-outline" size={12} color={colors['grey-02']} />
            <Text style={styles.actionText}>0</Text>
          </View>
        </View>
      </View>

      {/* 수직 구분선 */}
      <View style={styles.divider} />

      {/* 오른쪽 내용 영역 */}

      <View style={styles.rightSection}>
        <View style={styles.header}>
          <Text style={styles.authorName}>{authorDisplayName}</Text>
        </View>
        <Text style={styles.content} numberOfLines={10}>
          {content}
        </Text>

        {/* 하단 액션 버튼들 */}
        <View style={styles.footer}></View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors['light-grey-02'],
    padding: 16,
    minHeight: 160,
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  authorName: {
    fontSize: 12,
    fontWeight: '400',
    color: colors['grey-03'],
    lineHeight: 18,
  },
  dateContainer: {
    backgroundColor: colors['light-grey-02'],
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dateText: {
    fontSize: 10,
    fontWeight: '400',
    color: colors['dark-grey-01'],
    textAlign: 'center',
    lineHeight: 15,
  },
  leftSection: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftBottomSection: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  leftTopSection: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  emotionContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  emotionImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  emotionText: {
    fontSize: 24,
  },
  divider: {
    width: 1,
    backgroundColor: colors['light-grey-02'],
  },
  rightSection: {
    flex: 1,
    gap: 4,
  },
  content: {
    fontSize: 14,
    fontWeight: '400',
    color: colors['dark-grey-01'],
    lineHeight: 21,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '400',
    color: colors['grey-02'],
    lineHeight: 18,
  },
});

export default GroupJournalCard;
