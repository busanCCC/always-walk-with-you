import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { SvgUri } from 'react-native-svg';

interface EmotionIconProps {
  imageUrl: string | null;
  size?: number;
}

const EmotionIcon = ({ imageUrl, size = 36 }: EmotionIconProps) => {
  // 로컬 파일 경로인지 확인 (file:// 프로토콜로 시작하는지)
  const isLocalFile = imageUrl?.startsWith('file://');

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {imageUrl ? (
        imageUrl.endsWith('.svg') && !isLocalFile ? (
          // SVG는 네트워크 URL만 지원 (로컬 SVG는 일반 Image로 처리)
          <SvgUri width={size} height={size} uri={imageUrl} />
        ) : (
          <Image
            source={isLocalFile ? { uri: imageUrl } : { uri: imageUrl }}
            style={{ width: size, height: size }}
            resizeMode="contain"
            onError={(error) => {
              console.warn('EmotionIcon image load error:', error.nativeEvent.error);
            }}
          />
        )
      ) : (
        <View style={[styles.placeholder, { width: size, height: size }]} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    backgroundColor: '#E0E0E0',
    borderRadius: 18,
  },
});

export default EmotionIcon;
