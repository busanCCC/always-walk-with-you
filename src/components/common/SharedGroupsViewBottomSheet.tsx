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

interface SharedGroupsViewBottomSheetProps {
  sharedGroupIds: string[];
}

export interface SharedGroupsViewBottomSheetRef {
  present: () => void;
  dismiss: () => void;
}

const SharedGroupsViewBottomSheet = forwardRef<
  SharedGroupsViewBottomSheetRef,
  SharedGroupsViewBottomSheetProps
>(({ sharedGroupIds = [] }, ref) => {
  const bottomSheetModalRef = React.useRef<BottomSheetModal>(null);
  const { data: userGroups = [], isLoading } = useUserGroupsForSharing();
  const insets = useSafeAreaInsets();

  // 스냅 포인트 설정
  const snapPoints = useMemo(() => ['75%'], []);

  // 공유된 그룹들만 필터링
  const sharedGroups = useMemo(() => {
    return userGroups.filter((userGroup) => sharedGroupIds.includes(userGroup.group_id));
  }, [userGroups, sharedGroupIds]);

  useImperativeHandle(ref, () => ({
    present: () => {
      bottomSheetModalRef.current?.present();
    },
    dismiss: () => bottomSheetModalRef.current?.dismiss(),
  }));

  const handleClose = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
    ),
    []
  );

  const renderGroupItem = useCallback(({ item }: { item: UserGroup }) => {
    return (
      <View style={styles.groupCard}>
        <View style={styles.groupContent}>
          <Text style={styles.groupName}>{item.group.name}</Text>
          {item.group.description && (
            <Text style={styles.groupDescription}>{item.group.description}</Text>
          )}
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name="people" size={16} color={colors.primary.DEFAULT} />
        </View>
      </View>
    );
  }, []);

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="lock-closed-outline" size={48} color={colors['grey-02']} />
      <Text style={styles.emptyTitle}>비공개 일기입니다</Text>
      <Text style={styles.emptyDescription}>이 일기는 공유되지 않았습니다.</Text>
    </View>
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose={true}
      backgroundStyle={styles.bottomSheetBackground}
      handleIndicatorStyle={styles.handleIndicator}>
      <BottomSheetView style={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>공유된 순</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors['dark-grey-02']} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.scrollContainer}>
          {sharedGroups.length > 0 ? (
            <FlatList
              data={sharedGroups}
              renderItem={renderGroupItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.groupsContainer}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            renderEmptyState()
          )}
        </View>

        {/* Footer */}
        <View style={[styles.footerContainer, { paddingBottom: insets.bottom + spacing[4] }]}>
          <Text style={styles.footerText}>
            {sharedGroups.length > 0 && `총 ${sharedGroups.length}개의 순에 공유됨`}
          </Text>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[5],
    marginTop: spacing[2],
  },
  title: {
    ...fontStyles['lg-tight'],
    color: colors['dark-grey-02'],
  },
  closeButton: {
    padding: spacing[1],
  },
  scrollContainer: {
    flex: 1,
  },
  groupsContainer: {
    paddingBottom: spacing[4],
  },
  groupCard: {
    backgroundColor: colors['light-grey-01'],
    borderRadius: 16,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[3],
    minHeight: 60,
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
  groupContent: {
    flex: 1,
    justifyContent: 'center',
  },
  groupName: {
    ...fontStyles['lg-tight'],
    color: colors.black,
    fontWeight: '600',
    marginBottom: spacing[1],
  },
  groupDescription: {
    ...fontStyles['sm-normal'],
    color: colors['grey-02'],
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
  },
  emptyTitle: {
    ...fontStyles['lg-tight'],
    color: colors['dark-grey-02'],
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  emptyDescription: {
    ...fontStyles['base-normal'],
    color: colors['grey-02'],
    textAlign: 'center',
    lineHeight: 20,
  },
  footerContainer: {
    paddingTop: spacing[4],
    backgroundColor: colors.white,
    alignItems: 'center',
  },
  footerText: {
    ...fontStyles['sm-normal'],
    color: colors['grey-02'],
  },
});

export default SharedGroupsViewBottomSheet;
