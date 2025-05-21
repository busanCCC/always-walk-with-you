import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { SvgUri } from 'react-native-svg';

interface EmotionIconProps {
  imageUrl: string | null;
  size?: number;
}

const EmotionIcon = ({ imageUrl, size = 36 }: EmotionIconProps) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {imageUrl ? (
        imageUrl.endsWith('.svg') ? (
          <SvgUri width={size} height={size} uri={imageUrl} />
        ) : (
          <Image
            source={{ uri: imageUrl }}
            style={{ width: size, height: size }}
            resizeMode="contain"
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
