import React from 'react';
import {
  View,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  Platform,
  StyleSheet,
  Image,
} from 'react-native';
import StyledText from '@/components/common/StyledText';
import KakaoIcon from '@/assets/svg/kakao-icon.svg';
import theme from '@/constants/theme';
import logo from '@/assets/images/logo.png';
import { useSignInWithKakaoMutation } from '@/queries/authQueries';

export default function LoginScreen() {
  const { mutate: signInWithKakao, isError, isPending, error } = useSignInWithKakaoMutation();

  const handleKakaoLogin = async () => {
    signInWithKakao();
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image source={logo} style={styles.logo} />
        <View
          style={[
            styles.bottomContainer,
            Platform.OS === 'ios' ? styles.bottomContainerIOS : styles.bottomContainerAndroid,
          ]}>
          <TouchableOpacity
            style={styles.kakaoButton}
            onPress={handleKakaoLogin}
            disabled={isPending}>
            <KakaoIcon width={20} height={20} style={styles.kakaoIcon} />
            <StyledText variant="base-normal" colorKey="dark-grey-02">
              {isPending ? '로그인 중...' : '카카오로 3초만에 시작하기'}
            </StyledText>
          </TouchableOpacity>
          {isError && (
            <StyledText colorKey="red-500" variant="sm-normal">
              로그인 중 오류가 발생했습니다: {error?.message}
            </StyledText>
          )}
          <StyledText variant="xs-normal" colorKey="grey-02" style={styles.termsInfoText}>
            로그인함으로써 매일동행의 정책 및 약관에 동의합니다.
          </StyledText>
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => openLink('YOUR_TERMS_OF_SERVICE_URL')}>
              <StyledText variant="xs-normal" colorKey="grey-02" style={styles.linkText}>
                서비스 이용약관
              </StyledText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openLink('YOUR_PRIVACY_POLICY_URL')}
              style={styles.privacyLinkContainer}>
              <StyledText variant="xs-normal" colorKey="grey-02" style={styles.linkText}>
                개인정보 처리방침
              </StyledText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing['8'],
  },
  logo: {
    height: 80,
    resizeMode: 'contain',
    marginBottom: theme.spacing['8'],
  },
  bottomContainer: {
    position: 'absolute',
    bottom: theme.spacing['10'],
    width: '100%',
    alignItems: 'center',
  },
  bottomContainerIOS: {
    paddingBottom: 0,
  },
  bottomContainerAndroid: {
    paddingBottom: theme.spacing['5'],
  },
  kakaoButton: {
    marginBottom: theme.spacing['10'],
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.spacing['2'],
    backgroundColor: '#FEE500',
    paddingHorizontal: theme.spacing['5'],
    paddingVertical: theme.spacing['3'],
  },
  kakaoIcon: {
    marginRight: theme.spacing['2'],
  },
  termsInfoText: {
    textAlign: 'center',
  },
  linksContainer: {
    marginTop: theme.spacing['2'],
    flexDirection: 'row',
  },
  linkText: {
    textDecorationLine: 'underline',
  },
  privacyLinkContainer: {
    marginLeft: theme.spacing['2.5'],
  },
});
