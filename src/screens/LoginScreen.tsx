import React, { useEffect, useState } from 'react';
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
import GoogleIcon from '@/assets/svg/google-icon.svg';
import AppleIcon from '@/assets/svg/apple-icon.svg';
import theme from '@/constants/theme';
import logo from '@/assets/images/logo.png';
import {
  useSignInWithGoogleMutation,
  useSignInWithKakaoMutation,
  useSignInWithAppleMutation,
} from '@/queries/authQueries';
import { isAppleAuthenticationAvailable } from '@/apis/authApi';

export default function LoginScreen() {
  const [isAppleLoginAvailable, setIsAppleLoginAvailable] = useState(false);

  const { mutate: signInWithKakao, isPending: isKakaoPending } = useSignInWithKakaoMutation();

  const { mutate: signInWithGoogle, isPending: isGooglePending } = useSignInWithGoogleMutation();

  const { mutate: signInWithApple, isPending: isApplePending } = useSignInWithAppleMutation();

  useEffect(() => {
    // Apple 로그인 가능 여부 확인 (iOS에서만)
    const checkAppleAuth = async () => {
      const available = await isAppleAuthenticationAvailable();
      setIsAppleLoginAvailable(available);
    };

    checkAppleAuth();
  }, []);

  const handleKakaoLogin = async () => {
    signInWithKakao();
  };

  const handleGoogleLogin = async () => {
    signInWithGoogle();
  };

  const handleAppleLogin = async () => {
    signInWithApple();
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
            disabled={isKakaoPending}>
            <KakaoIcon width={20} height={20} style={styles.kakaoIcon} />
            <StyledText variant="base-normal" colorKey="dark-grey-02">
              {isKakaoPending ? '로그인 중...' : '카카오로 시작하기'}
            </StyledText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isGooglePending}>
            <GoogleIcon width={20} height={20} style={styles.googleIcon} />
            <StyledText variant="base-normal" colorKey="dark-grey-02">
              {isGooglePending ? '로그인 중...' : '구글로 시작하기'}
            </StyledText>
          </TouchableOpacity>

          {/* iOS에서만 Apple 로그인 버튼 표시 */}
          {isAppleLoginAvailable && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleLogin}
              disabled={isApplePending}>
              <AppleIcon width={20} height={20} style={styles.appleIcon} />
              <StyledText variant="base-normal" colorKey="white">
                {isApplePending ? '로그인 중...' : 'Apple로 시작하기'}
              </StyledText>
            </TouchableOpacity>
          )}

          {/* 토스트 메시지로 로그인 에러를 처리하므로 여기서는 제거 */}
          <StyledText variant="xs-normal" colorKey="grey-02" style={styles.termsInfoText}>
            로그인함으로써 매일동행의 정책 및 약관에 동의합니다.
          </StyledText>
          <View style={styles.linksContainer}>
            <TouchableOpacity
              onPress={() => openLink('https://always-walk-with-you.vercel.app/terms')}>
              <StyledText variant="xs-normal" colorKey="grey-02" style={styles.linkText}>
                서비스 이용약관
              </StyledText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => openLink('https://always-walk-with-you.vercel.app/privacy')}
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
    marginBottom: theme.spacing['24'],
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
    marginBottom: theme.spacing['3'],
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
  googleButton: {
    marginBottom: theme.spacing['3'],
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.spacing['2'],
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
    paddingHorizontal: theme.spacing['5'],
    paddingVertical: theme.spacing['3'],
  },
  googleIcon: {
    marginRight: theme.spacing['2'],
  },
  appleButton: {
    marginBottom: theme.spacing['10'],
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.spacing['2'],
    backgroundColor: '#000000',
    paddingHorizontal: theme.spacing['5'],
    paddingVertical: theme.spacing['3'],
  },
  appleIcon: {
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
