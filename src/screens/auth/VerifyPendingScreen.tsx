import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from '../../components/common/CustomButton';
import { HeaderMotif } from '../../components/common/HeaderMotif';
import { theme } from '../../constants/theme';
import { RootStackParamList, RootNavigationProp } from '../../navigation/types';

type VerifyPendingRouteProp = RouteProp<RootStackParamList, 'VerifyPending'>;

export const VerifyPendingScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<VerifyPendingRouteProp>();
  const email = route.params?.email || 'email của bạn';

  const handleResendEmail = () => {
    Alert.alert(
      'Đã gửi lại thư xác thực',
      `Hệ thống đã gửi một liên kết kích hoạt mới tới địa chỉ ${email}. Vui lòng kiểm tra hòm thư chính và thư rác.`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderMotif title="XÁC THỰC TÀI KHOẢN" showFlag={false} />

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail-unread-outline" size={54} color={theme.colors.primary} />
          </View>

          <Text style={styles.title}>Đăng ký thành công!</Text>
          <Text style={styles.subtitle}>
            Tài khoản của bạn đã được tạo trên hệ thống TaxKeep VN. Chúng tôi đã gửi liên kết xác thực tới:
          </Text>

          <View style={styles.emailBadge}>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <Text style={styles.note}>
            Vui lòng nhấn vào đường liên kết trong email để kích hoạt tài khoản trước khi thực hiện các thủ tục kê khai thuế.
          </Text>

          <CustomButton
            title="Đăng nhập ngay"
            onPress={() => navigation.replace('Login')}
            style={styles.primaryBtn}
          />

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={handleResendEmail}
            activeOpacity={0.7}
          >
            <Text style={styles.resendText}>Chưa nhận được thư? Gửi lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.titleLarge,
    color: theme.colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
    lineHeight: 22,
  },
  emailBadge: {
    backgroundColor: theme.colors.inputBackground,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  emailText: {
    ...theme.typography.bodyLarge,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
  note: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 18,
  },
  primaryBtn: {
    width: '100%',
    marginBottom: theme.spacing.md,
  },
  resendBtn: {
    paddingVertical: 8,
  },
  resendText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
