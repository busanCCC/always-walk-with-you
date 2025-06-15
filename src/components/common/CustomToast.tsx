import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fontStyles, spacing } from '@/constants/theme';

export const toastConfig = {
  success: (props: any) => (
    <View style={[styles.toastContainer, styles.successToast]}>
      <Text style={styles.title}>{props.text1}</Text>
      {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
    </View>
  ),
  error: (props: any) => (
    <View style={[styles.toastContainer, styles.errorToast]}>
      <Text style={styles.title}>{props.text1}</Text>
      {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
    </View>
  ),
  info: (props: any) => (
    <View style={[styles.toastContainer, styles.infoToast]}>
      <Text style={styles.title}>{props.text1}</Text>
      {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
    </View>
  ),
};

const styles = StyleSheet.create({
  toastContainer: {
    width: '90%',
    borderRadius: 16,
    marginBottom: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    elevation: 2,
  },
  successToast: {
    backgroundColor: colors.white,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary.DEFAULT,
  },
  errorToast: {
    backgroundColor: colors.white,
    borderLeftWidth: 4,
    borderLeftColor: colors.danger.DEFAULT,
  },
  infoToast: {
    backgroundColor: colors.white,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary.DEFAULT,
  },
  title: {
    ...fontStyles['base-tight'],
    color: colors['dark-grey-02'],
    marginBottom: spacing[1],
  },
  message: {
    ...fontStyles['sm-normal'],
    color: colors['grey-03'],
    lineHeight: 20,
  },
});
