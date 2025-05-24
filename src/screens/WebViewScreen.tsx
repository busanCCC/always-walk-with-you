import React from 'react';
import { SafeAreaView, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import theme from '@/constants/theme';
import type { RootStackParamList } from '@/navigation/types';

type WebViewScreenProps = NativeStackScreenProps<RootStackParamList, 'WebView'>;

const WebViewScreen: React.FC<WebViewScreenProps> = ({ route }) => {
  const { url } = route.params;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <ActivityIndicator
            color={theme.colors.primary.DEFAULT}
            size="large"
            style={styles.loadingIndicator}
          />
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  webview: {
    flex: 1,
  },
  loadingIndicator: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default WebViewScreen;
