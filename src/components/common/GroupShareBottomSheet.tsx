import React, {
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
  useState,
  useEffect,
} from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, spacing, fontStyles } from '@/constants/theme';
import { UserGroup } from '@/types/group';
import { useUserGroupsForSharing } from '@/queries/journalQueries';

interface GroupShareBottomSheetProps {
  onSelectGroups: (selectedGroupIds: string[]) => void;
  initialSelectedGroups?: string[];
}

export interface GroupShareBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

const GroupShareBottomSheet = forwardRef<GroupShareBottomSheetRef, GroupShareBottomSheetProps>(
  ({ onSelectGroups, initialSelectedGroups = [] }, ref) => {
    const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
    const { data: userGroups = [], isLoading } = useUserGroupsForSharing();
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialSelectedGroups);
    const insets = useSafeAreaInsets();

    // 스냅 포인트 설정
    const snapPoints = useMemo(() => ['75%'], []);

    useImperativeHandle(ref, () => ({
      present: () => {
        setSelectedGroupIds(initialSelectedGroups);
        bottomSheetModalRef.current?.present();
      },
      dismiss: () => bottomSheetModalRef.current?.dismiss(),
    }));

    // selectedGroupIds가 변경될 때마다 부모 컴포넌트에 전달
    useEffect(() => {
      onSelectGroups(selectedGroupIds);
    }, [selectedGroupIds, onSelectGroups]);

    const handleGroupPress = useCallback((groupId: string) => {
      setSelectedGroupIds((prev) => {
        const newSelected = prev.includes(groupId)
          ? prev.filter((id) => id !== groupId)
          : [...prev, groupId];

        return newSelected;
      });
    }, []);

    const handleConfirm = useCallback(() => {
      bottomSheetModalRef.current?.dismiss();
    }, []);

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      []
    );

    const renderGroupItem = useCallback(
      ({ item }: { item: UserGroup }) => {
        const isSelected = selectedGroupIds.includes(item.group_id);

        return (
          <TouchableOpacity
            style={[styles.groupCard, isSelected && styles.selectedGroupCard]}
            onPress={() => handleGroupPress(item.group_id)}
            activeOpacity={0.7}>
            <View style={styles.groupContent}>
              <Text style={styles.groupName}>{item.group.name}</Text>
            </View>
            <View style={styles.checkContainer}>
              <View style={[styles.checkCircle, isSelected && styles.selectedCheckCircle]}>
                {isSelected && <Ionicons name="checkmark" size={12} color={colors.white} />}
              </View>
            </View>
          </TouchableOpacity>
        );
      },
      [selectedGroupIds, handleGroupPress]
    );

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
          <Text style={styles.title}>어떤 순에 공유할까요?</Text>

          {/* Groups List */}
          <View style={styles.scrollContainer}>
            <FlatList
              data={userGroups}
              renderItem={renderGroupItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.groupsContainer}
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
  groupsContainer: {
    paddingBottom: spacing[4],
  },
  groupCard: {
    backgroundColor: colors['light-grey-01'],
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.white,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[3],
    minHeight: 45,
    shadowColor: 'rgba(149, 149, 149, 0.1)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedGroupCard: {
    borderColor: colors.primary.DEFAULT,
    borderWidth: 2,
  },
  groupContent: {
    flex: 1,
    justifyContent: 'center',
  },
  groupName: {
    ...fontStyles['lg-tight'],
    color: colors.black,
    fontWeight: '600',
  },
  checkContainer: {
    width: 21,
    height: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  selectedCheckCircle: {
    backgroundColor: colors.primary.DEFAULT,
    borderColor: colors.primary.DEFAULT,
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
  },
});

export default GroupShareBottomSheet;
