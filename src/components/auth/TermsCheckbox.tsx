import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';

interface TermsCheckboxProps {
  checked: boolean;
  onToggle: (newValue: boolean) => void;
  error?: string;
}

export const TermsCheckbox: React.FC<TermsCheckboxProps> = ({
  checked,
  onToggle,
  error,
}) => {
  const showTermsModal = (type: 'terms' | 'privacy') => {
    Alert.alert(
      type === 'terms' ? 'Điều khoản sử dụng' : 'Chính sách bảo mật',
      'Ứng dụng TaxKeep VN cam kết bảo mật toàn bộ dữ liệu người nộp thuế theo đúng Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân. Thông tin chỉ được sử dụng cho mục đích kê khai và quyết toán thuế.',
      [{ text: 'Đóng', style: 'cancel' }]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.checkbox, checked && styles.checkboxChecked]}
          onPress={() => onToggle(!checked)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
        >
          {checked ? <Ionicons name="checkmark" size={16} color="#FFFFFF" /> : null}
        </TouchableOpacity>

        <View style={styles.textContainer}>
          <Text style={styles.text}>
            Tôi đồng ý với{' '}
            <Text style={styles.link} onPress={() => showTermsModal('terms')}>
              Điều khoản sử dụng
            </Text>{' '}
            và{' '}
            <Text style={styles.link} onPress={() => showTermsModal('privacy')}>
              Chính sách bảo mật
            </Text>
            <Text style={styles.required}> *</Text>
          </Text>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.borderFocus,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  required: {
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: 4,
    marginLeft: 32,
  },
});
