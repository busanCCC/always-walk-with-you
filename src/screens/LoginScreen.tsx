import React from 'react';
import {
  View,
  TouchableOpacity,
  Linking,
  SafeAreaView,
  Platform,
  Image,
  StyleSheet,
} from 'react-native';
import { supabase } from '@/utils/supabaseClient';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, AuthSessionRedirectUriOptions } from 'expo-auth-session';
import { StatusBar } from 'expo-status-bar';
import StyledText from '@/components/common/StyledText';
import KakaoIcon from '@/assets/svg/kakao-icon.svg';
import theme from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

WebBrowser.maybeCompleteAuthSession();

const redirectUriOptions: AuthSessionRedirectUriOptions & { useProxy?: boolean } = {
  useProxy: true,
};
const redirectUri = makeRedirectUri(redirectUriOptions);
// console.log('Generated Redirect URI for Kakao (with proxy): ', redirectUri); // 개발 완료 후 제거 또는 주석 처리 권장

export default function LoginScreen() {
  const setAuthSessionData = useAuthStore((state) => state.setSessionData);

  const handleKakaoLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: redirectUri,
        },
      });

      // console.log('Kakao login data:', data); // 상세 로그 제거

      if (error) {
        console.error('Kakao login error:', error.message); // 오류 로그 유지
        return;
      }

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
        if (result.type === 'success') {
          // console.log('카카오 로그인 완료, URL에서 세션 정보 추출 중...', result.url); // 상세 로그 제거
          const { url } = result;
          const params = new URLSearchParams(url.split('#')[1]);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            // console.log('토큰 추출 완료, Supabase 세션 설정 중...'); // 상세 로그 제거
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              console.error('Supabase 세션 설정 오류:', sessionError.message); // 오류 로그 유지
              setAuthSessionData(null, null);
            } else if (sessionData.session && sessionData.user) {
              // console.log('Supabase 세션 수동 설정 완료. AuthStore 상태 업데이트 중...'); // 상세 로그 제거
              setAuthSessionData(sessionData.session, sessionData.user);
            } else {
              console.warn('Supabase 세션 설정은 성공했으나, session 또는 user 데이터가 없습니다.'); // 경고 로그 유지
              setAuthSessionData(null, null);
            }
          } else {
            console.warn('URL에서 토큰 정보를 추출하지 못했습니다.'); // 경고 로그 유지
          }
        } else {
          console.warn('카카오 로그인이 취소되었거나 실패했습니다:', result); // 경고 로그 유지
        }
      } else {
        console.log('카카오 로그인 시작을 위한 URL이 없습니다. (data.url is null)'); // 정보성 로그 유지
      }
    } catch (err) {
      console.error('카카오 로그인 처리 중 예외 발생:', err); // 오류 로그 유지
    }
  };

  const openLink = (url: string) => {
    Linking.openURL(url).catch((err) => console.error("Couldn't load page", err));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <View
          style={[
            styles.bottomContainer,
            Platform.OS === 'ios' ? styles.bottomContainerIOS : styles.bottomContainerAndroid,
          ]}>
          <TouchableOpacity style={styles.kakaoButton} onPress={handleKakaoLogin}>
            <KakaoIcon
              width={theme.spacing['6']}
              height={theme.spacing['6']}
              style={styles.kakaoIcon}
            />
            <StyledText variant="base-normal" colorKey="dark-grey-02">
              카카오로 3초만에 시작하기
            </StyledText>
          </TouchableOpacity>
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
  logoContainer: {
    marginBottom: theme.spacing['16'],
    alignItems: 'center',
  },
  logo: {
    width: theme.spacing['16'] * 4,
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
