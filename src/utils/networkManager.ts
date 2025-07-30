import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useContext, useEffect, useState } from 'react';

// 네트워크 상태 타입
export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string | null;
  isWifi: boolean;
  isCellular: boolean;
}

// 네트워크 이벤트 리스너 타입
export type NetworkChangeListener = (state: NetworkState) => void;

class NetworkManager {
  private listeners: Set<NetworkChangeListener> = new Set();
  private currentState: NetworkState = {
    isConnected: false,
    isInternetReachable: false,
    type: null,
    isWifi: false,
    isCellular: false,
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // 초기 네트워크 상태 확인
    const state = await NetInfo.fetch();
    this.updateState(state);

    // 네트워크 상태 변화 감지
    NetInfo.addEventListener((state) => {
      this.updateState(state);
    });
  }

  private updateState(netInfoState: any) {
    const newState: NetworkState = {
      isConnected: netInfoState.isConnected ?? false,
      isInternetReachable: netInfoState.isInternetReachable ?? false,
      type: netInfoState.type,
      isWifi: netInfoState.type === 'wifi',
      isCellular: netInfoState.type === 'cellular',
    };

    // 상태가 변경된 경우에만 리스너들에게 알림
    if (JSON.stringify(this.currentState) !== JSON.stringify(newState)) {
      this.currentState = newState;
      this.notifyListeners(newState);
    }
  }

  private notifyListeners(state: NetworkState) {
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });
  }

  /**
   * 현재 네트워크 상태 반환
   */
  getState(): NetworkState {
    return { ...this.currentState };
  }

  /**
   * 인터넷 연결 여부 확인
   */
  isOnline(): boolean {
    return this.currentState.isConnected && this.currentState.isInternetReachable;
  }

  /**
   * 오프라인 상태 확인
   */
  isOffline(): boolean {
    return !this.isOnline();
  }

  /**
   * WiFi 연결 여부 확인
   */
  isWifiConnected(): boolean {
    return this.currentState.isWifi && this.isOnline();
  }

  /**
   * 네트워크 변화 리스너 등록
   */
  addListener(listener: NetworkChangeListener): () => void {
    this.listeners.add(listener);

    // 등록 즉시 현재 상태 전달
    listener(this.currentState);

    // 리스너 제거 함수 반환
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 리스너 제거
   */
  removeListener(listener: NetworkChangeListener) {
    this.listeners.delete(listener);
  }

  /**
   * 모든 리스너 제거
   */
  removeAllListeners() {
    this.listeners.clear();
  }

  /**
   * 네트워크 재시도 (연결 테스트)
   */
  async refresh(): Promise<NetworkState> {
    const state = await NetInfo.refresh();
    this.updateState(state);
    return this.getState();
  }
}

// 싱글톤 인스턴스
export const networkManager = new NetworkManager();

// React Context를 위한 인터페이스
export interface NetworkContextType {
  isOnline: boolean;
  isOffline: boolean;
  isWifi: boolean;
  networkState: NetworkState;
  refresh: () => Promise<NetworkState>;
}

// React Context
export const NetworkContext = createContext<NetworkContextType | null>(null);

// Hook for using network state
export const useNetwork = (): NetworkContextType => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};

// Network Provider 컴포넌트
export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [networkState, setNetworkState] = useState<NetworkState>(networkManager.getState());

  useEffect(() => {
    const removeListener = networkManager.addListener((state) => {
      setNetworkState(state);
    });

    return removeListener;
  }, []);

  const value: NetworkContextType = {
    isOnline: networkManager.isOnline(),
    isOffline: networkManager.isOffline(),
    isWifi: networkState.isWifi,
    networkState,
    refresh: networkManager.refresh.bind(networkManager),
  };

  return React.createElement(NetworkContext.Provider, { value }, children);
};

// 유틸리티 함수들
export const withNetworkCheck = async function <T>(
  operation: () => Promise<T>,
  options?: {
    requireWifi?: boolean;
    fallback?: () => Promise<T>;
    onOffline?: () => void;
  }
): Promise<T> {
  const isOnline = networkManager.isOnline();
  const isWifi = networkManager.isWifiConnected();

  if (!isOnline) {
    if (options?.onOffline) {
      options.onOffline();
    }
    if (options?.fallback) {
      return options.fallback();
    }
    throw new Error('네트워크 연결이 필요합니다.');
  }

  if (options?.requireWifi && !isWifi) {
    throw new Error('WiFi 연결이 필요합니다.');
  }

  return operation();
};

// 네트워크 상태 로깅
export const logNetworkState = () => {
  const state = networkManager.getState();
  console.log('🌐 Network State:', {
    online: networkManager.isOnline(),
    connected: state.isConnected,
    reachable: state.isInternetReachable,
    type: state.type,
  });
};
