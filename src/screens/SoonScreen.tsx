import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import theme from '@/constants/theme';
import { useUserGroups } from '@/queries/groupQueries';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { GroupWithMembershipDetails } from '@/types/group';
import AddGroupModal from '@/components/common/AddGroupModal';
import { useFocusEffect } from '@react-navigation/native';
import { MainTabParamList, RootStackParamList } from '@/navigation/types';

type SoonScreenRouteProp = RouteProp<MainTabParamList, '순'>;
type SoonScreenNavigationProp = BottomTabNavigationProp<MainTabParamList, '순'>;

const SoonScreen: React.FC = () => {
  const navigation = useNavigation<SoonScreenNavigationProp>();
  const route = useRoute<SoonScreenRouteProp>();
  const { data: groups, isLoading, isError, error, refetch } = useUserGroups();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  useEffect(() => {
    if (route.params?.showAddGroupModal) {
      setModalVisible(true);
      navigation.setParams({ showAddGroupModal: false });
    }
  }, [route.params, navigation]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleGroupPress = (group: GroupWithMembershipDetails) => {
    const parentNavigation = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
    if (parentNavigation) {
      parentNavigation.navigate('GroupDetail', {
        groupId: group.id,
        groupName: group.name,
      });
    }
  };

  const handleRetry = () => {
    refetch();
  };

  const handleModalSuccess = () => {
    refetch();
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>데이터를 불러오는 중 오류가 발생했습니다.</Text>
        <Text style={styles.errorSubText}>{(error as Error)?.message || '다시 시도해주세요.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.title}>나의 순</Text>

        {groups && groups.length > 0 ? (
          groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => handleGroupPress(group)}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardTitle}>{group.name}</Text>
                  <Text style={styles.cardMembers}>{group.member_count}</Text>
                </View>
                {group.has_new_content && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>N</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardDescription}>{group.description || ''}</Text>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>참여 중인 순 그룹이 없습니다.</Text>
            <Text style={styles.emptySubText}>
              오른쪽 상단의 + 버튼으로 그룹을 생성하거나{'\n'}초대를 기다려주세요.
            </Text>
          </View>
        )}
      </ScrollView>

      <AddGroupModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleModalSuccess}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing[4],
  },
  centerContainer: {
    flex: 1,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
  },
  title: {
    ...theme.fontStyles['xl-tight'],
    color: theme.colors['grey-04'],
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[3],
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: theme.colors['light-grey-02'],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[1],
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1.5],
  },
  cardTitle: {
    ...theme.fontStyles['lg-tight'],
    color: theme.colors['grey-04'],
  },
  cardMembers: {
    ...theme.fontStyles['sm-tight'],
    color: theme.colors['grey-01'],
  },
  newBadge: {
    backgroundColor: theme.colors.secondary.DEFAULT,
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[0.5],
    borderRadius: 16,
  },
  newBadgeText: {
    fontFamily: theme.fonts.bold,
    fontSize: 10,
    color: theme.colors.white,
  },
  cardDescription: {
    ...theme.fontStyles['sm-tight'],
    color: theme.colors['grey-01'],
    marginBottom: theme.spacing[1],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing[12],
  },
  emptyText: {
    ...theme.fontStyles['lg-tight'],
    color: theme.colors['grey-03'],
    marginBottom: theme.spacing[2],
  },
  emptySubText: {
    ...theme.fontStyles['sm-tight'],
    color: theme.colors['grey-01'],
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    ...theme.fontStyles['lg-tight'],
    color: theme.colors['grey-03'],
    marginBottom: theme.spacing[1],
  },
  errorSubText: {
    ...theme.fontStyles['sm-tight'],
    color: theme.colors['grey-01'],
    textAlign: 'center',
    marginBottom: theme.spacing[4],
  },
  retryButton: {
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[2.5],
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 8,
  },
  retryButtonText: {
    ...theme.fontStyles['sm-tight'],
    color: theme.colors.white,
  },
});

export default SoonScreen;
