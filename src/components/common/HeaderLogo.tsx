import React from 'react';
import { Image, StyleSheet, Platform } from 'react-native';
import logo from '@/assets/images/logo.png';

const HeaderLogo = () => {
  return <Image source={logo} style={styles.logo} />;
};

const styles = StyleSheet.create({
  logo: {
    width: 70,
    height: 26,
    resizeMode: 'contain',
  },
});

export default HeaderLogo;
