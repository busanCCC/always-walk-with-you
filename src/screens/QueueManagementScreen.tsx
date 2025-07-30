import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { uploadQueueManager, QueueStats, QueueItemWithJournal } from '@/utils/uploadQueueManager';
import { useNetwork } from '@/utils/networkManager';
import { colors } from '@/constants/theme';
import StyledText from '@/components/common/StyledText';
import CustomHeader from '@/components/common/CustomHeader';

const QueueManagementScreen = () => {
  const { isOnline } = useNetwork();
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [queueItems, setQueueItems] = useState<QueueItemWithJournal[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 큐 통계 가져오기
  const fetchQueueStats = useCallback(async () => {
    try {
      const stats = await uploadQueueManager.getQueueStats();
      setQueueStats(stats);
    } catch (error) {
      console.error('큐 통계 가져오기 실패:', error);
    }
  }, []);

  // 큐 아이템 가져오기
  const fetchQueueItems = useCallback(async () => {
    try {
      setLoading(true);
      const items = await uploadQueueManager.getQueueItems();
      setQueueItems(items);
    } catch (error) {
      console.error('큐 아이템 가져오기 실패:', error);
      Toast.show({
        type: 'error',
        text1: '오류',
        text2: '큐 데이터를 불러올 수 없습니다.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // 새로고침
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchQueueStats(), fetchQueueItems()]);
    setRefreshing(false);
  }, [fetchQueueStats, fetchQueueItems]);

  // 실패한 항목 재시도
  const handleRetryFailed = useCallback(async () => {
    try {
      await uploadQueueManager.retryFailedItems();
      Toast.show({
        type: 'success',
        text1: '재시도 완료',
        text2: '실패한 항목들을 다시 시도했습니다.',
      });
      await onRefresh();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: '재시도 실패',
        text2: '실패한 항목 재시도 중 오류가 발생했습니다.',
      });
    }
  }, [onRefresh]);

  // 큐 전체 삭제
  const handleClearQueue = useCallback(() => {
    Alert.alert(
      '큐 비우기',
      '모든 대기 중인 항목을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await uploadQueueManager.clearQueue();
              Toast.show({
                type: 'success',
                text1: '큐 삭제 완료',
                text2: '모든 대기 항목이 삭제되었습니다.',
              });
              await onRefresh();
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: '삭제 실패',
                text2: '큐 삭제 중 오류가 발생했습니다.',
              });
            }
          },
        },
      ]
    );
  }, [onRefresh]);

  // 화면 포커스 시 데이터 새로고침
  useFocusEffect(
    useCallback(() => {
      fetchQueueStats();
      fetchQueueItems();
    }, [fetchQueueStats, fetchQueueItems])
  );

  // 네트워크 상태 변경 시 데이터 새로고침
  useEffect(() => {
    fetchQueueStats();
  }, [isOnline, fetchQueueStats]);

  // 상태 아이콘 렌더링
  const renderStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Ionicons name="time-outline" size={16} color={colors.secondary.DEFAULT} />;
      case 'processing':
        return <Ionicons name="sync-outline" size={16} color={colors.primary.DEFAULT} />;
      case 'failed':
        return <Ionicons name="alert-circle-outline" size={16} color={colors.danger.DEFAULT} />;
      case 'completed':
        return <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />;
      default:
        return <Ionicons name="help-circle-outline" size={16} color={colors['grey-02']} />;
    }
  };

  // 상태 텍스트 렌더링
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '대기중';
      case 'processing':
        return '처리중';
      case 'failed':
        return '실패';
      case 'completed':
        return '완료';
      default:
        return '알 수 없음';
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('ko-KR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader title="업로드 큐 관리" showBackButton />

      <View style={styles.content}>
        {/* 큐 항목 목록 */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {loading ? (
            <View style={styles.emptyContainer}>
              <StyledText style={styles.emptyText}>로딩 중...</StyledText>
            </View>
          ) : queueItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <StyledText style={styles.emptyText}>업로드 큐가 비어있습니다</StyledText>
            </View>
          ) : (
            queueItems.map((item, index) => (
              <View key={`${item.id}-${index}`} style={styles.queueItem}>
                <View style={styles.queueItemHeader}>
                  <View style={styles.queueItemLeft}>
                    <StyledText style={styles.queueItemTitle}>
                      {item.journal?.date ? `${item.journal.date} 일기` : '일기'}
                    </StyledText>
                    <StyledText style={styles.queueItemDate}>
                      {formatDate(item.createdAt)}
                    </StyledText>
                  </View>
                </View>

                <View style={styles.queueItemDetails}>
                  <View style={styles.queueItemRow}>
                    {renderStatusIcon(item.attempts >= 3 ? 'failed' : 'pending')}
                    <StyledText style={styles.queueItemStatus}>
                      {getStatusText(item.attempts >= 3 ? 'failed' : 'pending')}
                    </StyledText>
                  </View>

                  <StyledText style={styles.queueItemOperation}>
                    작업:{' '}
                    {item.type === 'create_journal'
                      ? '생성'
                      : item.type === 'update_journal'
                        ? '수정'
                        : item.type === 'delete_journal'
                          ? '삭제'
                          : item.type}
                  </StyledText>

                  {item.attempts > 0 && (
                    <StyledText style={styles.queueItemAttempts}>
                      시도 횟수: {item.attempts}
                    </StyledText>
                  )}

                  {item.errorMessage && (
                    <StyledText style={styles.queueItemError} numberOfLines={2}>
                      오류: {item.errorMessage}
                    </StyledText>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* 액션 버튼들 */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              queueStats && queueStats.failed > 0
                ? styles.retryButtonActive
                : styles.retryButtonDisabled,
            ]}
            onPress={handleRetryFailed}
            disabled={!queueStats || queueStats.failed === 0}>
            <Ionicons
              name="refresh-outline"
              size={20}
              color={queueStats && queueStats.failed > 0 ? '#ffffff' : colors['grey-02']}
            />
            <StyledText
              style={[
                styles.actionButtonText,
                queueStats && queueStats.failed > 0
                  ? styles.activeButtonText
                  : styles.disabledButtonText,
              ]}>
              실패 항목 재시도
            </StyledText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              queueStats && queueStats.total > 0
                ? styles.clearButtonActive
                : styles.clearButtonDisabled,
            ]}
            onPress={handleClearQueue}
            disabled={!queueStats || queueStats.total === 0}>
            <Ionicons
              name="trash-outline"
              size={20}
              color={queueStats && queueStats.total > 0 ? '#ffffff' : colors['grey-02']}
            />
            <StyledText
              style={[
                styles.actionButtonText,
                queueStats && queueStats.total > 0
                  ? styles.activeButtonText
                  : styles.disabledButtonText,
              ]}>
              큐 비우기
            </StyledText>
          </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors['light-grey-02'],
    backgroundColor: colors.white,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  retryButtonActive: {
    backgroundColor: colors.primary.DEFAULT,
  },
  retryButtonDisabled: {
    backgroundColor: colors['light-grey-02'],
  },
  clearButtonActive: {
    backgroundColor: colors.danger.DEFAULT,
  },
  clearButtonDisabled: {
    backgroundColor: colors['light-grey-02'],
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeButtonText: {
    color: '#ffffff',
  },
  disabledButtonText: {
    color: colors['grey-02'],
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors['grey-02'],
    textAlign: 'center',
  },
  queueItem: {
    backgroundColor: colors.white,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors['light-grey-02'],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  queueItemHeader: {
    marginBottom: 8,
  },
  queueItemLeft: {
    flex: 1,
  },
  queueItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors['dark-grey-01'],
    marginBottom: 4,
  },
  queueItemDate: {
    fontSize: 12,
    color: colors['grey-02'],
  },
  queueItemDetails: {
    gap: 6,
  },
  queueItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  queueItemStatus: {
    fontSize: 14,
    fontWeight: '500',
    color: colors['dark-grey-01'],
  },
  queueItemOperation: {
    fontSize: 14,
    color: colors['grey-02'],
  },
  queueItemAttempts: {
    fontSize: 12,
    color: colors['grey-02'],
  },
  queueItemError: {
    fontSize: 12,
    color: colors.danger.DEFAULT,
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default QueueManagementScreen;
