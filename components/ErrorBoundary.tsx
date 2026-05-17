import React, { ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { logger } from '../src/lib/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ''
  };

  public static getDerivedStateFromError(error: Error): State {
    // تحديث الـ state عشان نعرض شاشة الخطأ
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // هنا ممكن مستقبلاً نربطها بـ Sentry أو Crashlytics عشان تتبع الأخطاء
    logger.error('App crashed:', error, errorInfo);
  }

  // دالة لإعادة المحاولة
  private resetError = () => {
    this.setState({ hasError: false, errorMsg: '' });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="warning" size={64} color="#EF4444" style={styles.icon} />
          <Text style={styles.title}>عذراً، حدث خطأ غير متوقع</Text>
          <Text style={styles.subtitle}>نحن نعمل على حل المشكلة، يرجى المحاولة مرة أخرى.</Text>
          
          <TouchableOpacity style={styles.button} onPress={this.resetError}>
            <Text style={styles.buttonText}>إعادة المحاولة</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F9F6F0',
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#2A4B46',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});