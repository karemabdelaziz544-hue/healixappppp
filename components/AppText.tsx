import React from 'react';
import { Text as RNText, TextInput as RNTextInput, TextProps, TextInputProps, StyleSheet } from 'react-native';
import { AppFontFamily } from '@/constants/AppTheme';

export function Text(props: TextProps) {
  return <RNText {...props} style={[styles.defaultText, props.style]} />;
}

export function TextInput(props: TextInputProps) {
  return <RNTextInput {...props} style={[styles.defaultText, props.style]} />;
}

const styles = StyleSheet.create({
  defaultText: {
    fontFamily: AppFontFamily.regular,
  },
});
