import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import theme from '@/constants/theme';
import { supabase } from '@/utils/supabaseClient';
import { useAuthStore } from '@/store/authStore';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import StyledButton from '@/components/common/StyledButton';
import CustomHeader from '@/components/common/CustomHeader';
import AlertModal from '@/components/common/AlertModal';
import Ionicons from '@expo/vector-icons/Ionicons';
import { RootStackParamList } from '@/navigation/types';

type ProfileSetupScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ProfileSetup'
>;

export default function ProfileSetupScreen() {
  const user = useAuthStore((state) => state.user);
  const profileCompleted = useAuthStore((state) => state.profileCompleted);
  const setProfileCompleted = useAuthStore((state) => state.setProfileCompleted);
  const signOut = useAuthStore((state) => state.signOut);
  const navigation = useNavigation<ProfileSetupScreenNavigationProp>();

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string) => {
    setAlertModal({ visible: true, title, message });
  };

  const hideAlert = () => {
    setAlertModal({ visible: false, title: '', message: '' });
  };

  // profileCompleted 상태 변경 감지하여 네비게이션 처리
  useEffect(() => {
    if (profileCompleted) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    }
  }, [profileCompleted, navigation]);

  const handleClose = () => {
    signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  const handleSaveProfile = async () => {
    if (!user) {
      showAlert('오류', '사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      return;
    }
    if (!name) {
      showAlert('정보 입력 필요', '닉네임은 필수 항목입니다.');
      return;
    }

    setLoading(true);
    try {
      const email = user.email;
      const { error } = await supabase
        .from('users')
        .upsert(
          {
            id: user.id,
            name,
            email,
            profile_img: null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'id',
          }
        )
        .select()
        .single();

      if (error) {
        console.error('프로필 저장 오류:', error);
        showAlert('오류', '프로필 저장 중 문제가 발생했습니다: ' + error.message);
      } else {
        setProfileCompleted(true);
        // AppNavigator가 profileCompleted 상태 변경을 감지하여 자동으로 Main으로 이동됩니다
      }
    } catch (e) {
      console.error('프로필 저장 예외:', e);
      showAlert('오류', '프로필 저장 중 예외가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const placeholderTextColor = theme.colors['grey-01'];
  const defaultTextColor = theme.colors['dark-grey-02'];

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomHeader
        title="회원가입"
        showBackButton={false}
        headerRight={
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors['dark-grey-02']} />
          </TouchableOpacity>
        }
        noBorder
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled">
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>매일 동행으로</Text>
            <Text style={styles.headerTitle}>하나님과의 동행을 경험해요</Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              style={styles.input}
              placeholder="닉네임"
              value={name}
              onChangeText={setName}
              placeholderTextColor={placeholderTextColor}
            />

            {/* <TextInput
              style={styles.input}
              placeholder="순명 (선택)"
              value={soonName}
              onChangeText={setSoonName}
              placeholderTextColor={placeholderTextColor}
            />
            <TextInput
              style={styles.input}
              placeholder="전화번호 (선택) 예: 010-1234-5678"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholderTextColor={placeholderTextColor}
            /> */}
          </View>
        </ScrollView>
        <View style={styles.buttonContainer}>
          <StyledButton
            title={loading ? '저장 중...' : '확인'}
            onPress={handleSaveProfile}
            disabled={loading || !name}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        onClose={hideAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  closeButton: {
    padding: theme.spacing['2'],
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing['5'],
  },
  headerTextContainer: {
    marginTop: theme.spacing['6'],
    marginBottom: theme.spacing['6'],
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: theme.fontStyles['2xl-tight'].fontFamily,
    fontSize: theme.fontStyles['2xl-tight'].fontSize,
    lineHeight: theme.fontStyles['2xl-tight'].lineHeight,
    color: theme.colors['dark-grey-02'],
  },
  infoText: {
    fontFamily: theme.fontStyles['base-normal'].fontFamily,
    fontSize: theme.fontStyles['sm-normal'].fontSize,
    color: theme.colors['grey-02'],
    marginBottom: theme.spacing['6'],
    lineHeight: theme.fontStyles['sm-normal'].lineHeight,
  },
  formContainer: {
    flex: 1,
  },
  input: {
    fontFamily: theme.fontStyles['base-normal'].fontFamily,
    fontSize: theme.fontStyles['base-normal'].fontSize,
    color: theme.colors['dark-grey-02'],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors['light-grey-02'],
    paddingVertical: theme.spacing['3'],
    marginBottom: theme.spacing['5'],
  },
  pickerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors['light-grey-02'],
  },
  picker: {
    fontFamily: theme.fontStyles['base-normal'].fontFamily,
    fontSize: theme.fontStyles['base-normal'].fontSize,
    marginLeft: -theme.spacing['3'],
  },
  pickerItem: {
    fontFamily: theme.fontStyles['base-normal'].fontFamily,
    fontSize: theme.fontStyles['base-normal'].fontSize,
    color: theme.colors['dark-grey-02'],
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing['5'],
    paddingBottom: Platform.OS === 'ios' ? theme.spacing['5'] : theme.spacing['4'],
    paddingTop: theme.spacing['2.5'],
  },
});
