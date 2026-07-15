import { Text, TextInput } from '@/components/AppText';
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';;
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppRadius, AppSpacing, AppFontSize } from '../../constants/AppTheme';

interface AuthInputProps extends TextInputProps {
  label: string;
  isPassword?: boolean;
  hint?: string;
  headerRight?: React.ReactNode;
  isLTR?: boolean;
}

export const AuthInput: React.FC<AuthInputProps> = ({ label, isPassword, hint, headerRight, isLTR, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {headerRight}
      </View>
      
      {isPassword ? (
        <View style={styles.passwordContainer}>
          <TextInput
            {...props}
            style={[styles.input, { flex: 1, height: '100%', textAlign: isLTR || isPassword ? 'left' : 'right' }, props.style]}
            secureTextEntry={!showPassword}
            accessibilityLabel={label}
          />
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)} 
            style={styles.eyeIcon}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={AppColors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        <TextInput
          {...props}
          style={[styles.input, { textAlign: isLTR ? 'left' : 'right' }, props.style]}
          accessibilityLabel={label}
        />
      )}
      
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: { marginBottom: AppSpacing.lg },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: AppSpacing.sm },
  label: { fontSize: AppFontSize.sm, fontWeight: 'bold', color: AppColors.textSecondary, textAlign: 'right' },
  input: { 
    backgroundColor: AppColors.inputBg, 
    height: 55, 
    borderRadius: AppRadius.lg, 
    paddingHorizontal: AppSpacing.lg, 
    textAlign: 'right', // overridden by inline styles if isLTR is true
    fontSize: AppFontSize.md, 
    color: AppColors.textPrimary 
  },
  passwordContainer: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    backgroundColor: AppColors.inputBg, 
    height: 55, 
    borderRadius: AppRadius.lg 
  },
  eyeIcon: { padding: AppSpacing.md },
  hint: { fontSize: AppFontSize.xs, color: AppColors.textMuted, textAlign: 'right', marginTop: AppSpacing.xs, fontWeight: 'bold' },
});
