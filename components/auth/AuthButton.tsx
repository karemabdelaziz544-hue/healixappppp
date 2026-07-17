import { Text } from '@/components/AppText';
import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';;
import { AppColors, AppRadius, AppSpacing, AppFontSize, AppFontFamily } from '../../constants/AppTheme';

interface AuthButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: any;
}

export const AuthButton: React.FC<AuthButtonProps> = ({ title, onPress, loading, disabled, style }) => {
  return (
    <TouchableOpacity 
      style={[styles.submitBtn, style, disabled && styles.disabled]} 
      onPress={onPress} 
      disabled={loading || disabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: loading || disabled, busy: loading }}
    >
      {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>{title}</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  submitBtn: { 
    backgroundColor: AppColors.primary, 
    height: 55, 
    borderRadius: AppRadius.full, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: AppSpacing.lg,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnText: { 
    color: '#FFF', 
    fontSize: AppFontSize.xl, 
    fontFamily: AppFontFamily.bold,
  },
  disabled: {
    opacity: 0.6
  }
});
