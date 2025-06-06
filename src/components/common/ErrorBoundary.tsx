import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Application from 'expo-application';
import theme from '@/constants/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // 에러 로깅 (추후 Sentry 등으로 대체 가능)
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);

    // 프로덕션에서는 에러 리포팅 서비스로 전송
    if (!__DEV__) {
      // TODO: 에러 리포팅 서비스 (Sentry, Bugsnag 등)로 전송
      console.log('Production error logged:', {
        error: error.message,
        stack: error.stack,
        errorInfo,
        appVersion: Application.nativeApplicationVersion,
        buildVersion: Application.nativeBuildVersion,
      });
    }
  }

  handleRestart = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback UI 또는 props로 전달된 fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>앱에 문제가 발생했습니다</Text>
          <Text style={styles.message}>
            일시적인 오류가 발생했습니다.{'\n'}
            앱을 다시 시작해보세요.
          </Text>

          {__DEV__ && this.state.error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorText}>Error: {this.state.error.message}</Text>
              <Text style={styles.errorStack}>{this.state.error.stack}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.button} onPress={this.handleRestart}>
            <Text style={styles.buttonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing['8'],
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors['dark-grey-01'],
    marginBottom: theme.spacing['4'],
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: theme.colors['grey-01'],
    textAlign: 'center',
    marginBottom: theme.spacing['8'],
    lineHeight: 24,
  },
  errorDetails: {
    backgroundColor: theme.colors['grey-03'],
    padding: theme.spacing['4'],
    borderRadius: theme.spacing['2'],
    marginBottom: theme.spacing['6'],
    maxHeight: 200,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.danger.DEFAULT,
    fontWeight: 'bold',
    marginBottom: theme.spacing['2'],
  },
  errorStack: {
    fontSize: 12,
    color: theme.colors['grey-01'],
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: theme.spacing['6'],
    paddingVertical: theme.spacing['3'],
    borderRadius: theme.spacing['2'],
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorBoundary;
