import React, { useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fontStyles } from '@/constants/theme';
import { Emotion } from '@/types/journal';
import { useEmotionsQuery } from '@/queries/journalQueries';

interface EmotionBottomSheetProps {
  onSelectEmotion: (emotion: Emotion) => void;
  selectedEmotion?: Emotion | null;
}

export interface EmotionBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

const EmotionBottomSheet = forwardRef<EmotionBottomSheetRef, EmotionBottomSheetProps>(
  ({ onSelectEmotion, selectedEmotion }, ref) => {
    const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
    const { data: emotions = [] } = useEmotionsQuery();
    const insets = useSafeAreaInsets();

    // 스냅 포인트 설정 (높이 조절 가능)
    const snapPoints = useMemo(() => ['75%'], []);

    useImperativeHandle(ref, () => ({
      present: () => bottomSheetModalRef.current?.present(),
      dismiss: () => bottomSheetModalRef.current?.dismiss(),
    }));

    const handleEmotionPress = useCallback(
      (emotion: Emotion) => {
        onSelectEmotion(emotion);
      },
      [onSelectEmotion]
    );

    const handleConfirm = useCallback(() => {
      bottomSheetModalRef.current?.dismiss();
    }, []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      []
    );

    const renderEmotionItem = useCallback(
      ({ item }: { item: Emotion }) => {
        const isSelected = selectedEmotion?.id === item.id;

        return (
          <TouchableOpacity
            style={[styles.emotionCard, isSelected && styles.selectedEmotionCard]}
            onPress={() => handleEmotionPress(item)}
            activeOpacity={0.7}>
            <View style={styles.emotionContent}>
              <Text style={styles.emotionName}>{item.name}</Text>
            </View>
            <View style={styles.emotionIconContainer}>
              {item.img_url ? (
                <Image source={{ uri: item.img_url }} style={styles.emotionIcon} />
              ) : (
                <View style={styles.defaultEmotionIcon}>
                  <Text style={styles.defaultEmotionText}>{item.name.charAt(0)}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        );
      },
      [selectedEmotion, handleEmotionPress]
    );

    const renderColumnWrapper = ({ item, index }: { item: Emotion[]; index: number }) => (
      <View style={styles.row}>
        {item.map((emotion, idx) => (
          <View key={emotion.id} style={styles.emotionCardWrapper}>
            {renderEmotionItem({ item: emotion })}
          </View>
        ))}
      </View>
    );

    // 감정 데이터를 2개씩 묶어서 row로 만들기
    const emotionRows = useMemo(() => {
      const rows = [];
      for (let i = 0; i < emotions.length; i += 2) {
        rows.push(emotions.slice(i, i + 2));
      }
      return rows;
    }, [emotions]);

    return (
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose={false}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}>
        <BottomSheetView style={styles.contentContainer}>
          {/* Title */}
          <Text style={styles.title}>어떤 기분/감정인가요?</Text>

          {/* Emotions Grid */}
          <View style={styles.scrollContainer}>
            <FlatList
              data={emotionRows}
              renderItem={renderColumnWrapper}
              keyExtractor={(_item, index) => `row-${index}`}
              contentContainerStyle={styles.emotionsContainer}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* 확인 버튼 */}
          <View
            style={[styles.confirmButtonContainer, { paddingBottom: insets.bottom + spacing[4] }]}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              activeOpacity={0.7}>
              <Text style={styles.confirmButtonText}>확인</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleIndicator: {
    backgroundColor: colors['grey-02'],
    width: 44,
    height: 4,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  scrollContainer: {
    flex: 1,
  },
  title: {
    ...fontStyles['lg-tight'],
    color: colors['dark-grey-02'],
    marginBottom: spacing[5],
    marginTop: spacing[2],
    textAlign: 'left',
  },
  emotionsContainer: {
    paddingBottom: spacing[4],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  emotionCardWrapper: {
    width: '48%',
  },
  emotionCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors['light-grey-01'],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    minHeight: 78,
    shadowColor: 'rgba(149, 149, 149, 0.1)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedEmotionCard: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
  },
  emotionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  emotionName: {
    ...fontStyles['lg-tight'],
    color: colors['dark-grey-02'],
    marginBottom: spacing[1],
  },
  emotionIconContainer: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    width: 40,
    height: 40,
  },
  emotionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  defaultEmotionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFE474',
    alignItems: 'center',
    justifyContent: 'center',
  },
  defaultEmotionText: {
    fontSize: 24,
  },
  confirmButtonContainer: {
    paddingTop: spacing[4],
    backgroundColor: colors.white,
  },
  confirmButton: {
    backgroundColor: colors.primary.DEFAULT,
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    ...fontStyles['lg-tight'],
    color: colors.white,
    fontWeight: '600',
  },
});

export default EmotionBottomSheet;
