import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors, AppRadius, AppSpacing, AppFontSize } from '../../constants/AppTheme';

interface AuthInputProps extends TextInputProps {
  label: string;
  isPassword?: boolean;
  hint?: string;
  headerRight?: React.ReactNode;
}

export const AuthInput: React.FC<AuthInputProps> = ({ label, isPassword, hint, headerRight, ...props }) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.inputGroup}>
      <View style={styles.header}>
        {headerRight}
        <Text style={styles.label}>{label}</Text>
      </View>
      
      {isPassword ? (
        <View style={styles.passwordContainer}>
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)} 
            style={styles.eyeIcon}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          >
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={AppColors.textMuted} />
          </TouchableOpacity>
          <TextInput
            {...props}
            style={[styles.input, { flex: 1, height: '100%' }, props.style]}
            secureTextEntry={!showPassword}
            accessibilityLabel={label}
          />
        </View>
      ) : (
        <TextInput
          {...props}
          style={[styles.input, props.style]}
          accessibilityLabel={label}
        />
      )}
      
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  inputGroup: { marginBottom: AppSpacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: AppSpacing.sm },
  label: { fontSize: AppFontSize.sm, fontWeight: 'bold', color: AppColors.textSecondary, textAlign: 'right', flex: 1 },
  input: { 
    backgroundColor: AppColors.inputBg, 
    height: 55, 
    borderRadius: AppRadius.lg, 
    paddingHorizontal: AppSpacing.lg, 
    textAlign: 'right', 
    fontSize: AppFontSize.md, 
    color: AppColors.textPrimary 
  },
  passwordContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: AppColors.inputBg, 
    height: 55, 
    borderRadius: AppRadius.lg 
  },
  eyeIcon: { padding: AppSpacing.md },
  hint: { fontSize: AppFontSize.xs, color: AppColors.textMuted, textAlign: 'right', marginTop: AppSpacing.xs, fontWeight: 'bold' },
});
