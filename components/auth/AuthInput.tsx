import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../../constants/AppTheme';

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
            <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
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
  inputGroup: { marginBottom: 15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#4B5563', textAlign: 'right', flex: 1 },
  input: { 
    backgroundColor: AppColors.inputBg || '#F3F4F6', 
    height: 55, 
    borderRadius: 15, 
    paddingHorizontal: 15, 
    textAlign: 'right', 
    fontSize: 14, 
    color: AppColors.textPrimary || '#1F2937' 
  },
  passwordContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: AppColors.inputBg || '#F3F4F6', 
    height: 55, 
    borderRadius: 15 
  },
  eyeIcon: { padding: 12 },
  hint: { fontSize: 11, color: AppColors.textMuted || '#9CA3AF', textAlign: 'right', marginTop: 5, fontWeight: 'bold' },
});
