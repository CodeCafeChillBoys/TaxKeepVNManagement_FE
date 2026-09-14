import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { profileApi, UserProfileResponse } from '../../api/profileApi';
import { RootNavigationProp } from '../../navigation/types';
import { useAuthStore } from '../../stores/useAuthStore';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async (isPullRefresh = false) => {
    try {
      if (isPullRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const data = await profileApi.getProfile();
      setProfile(data);
    } catch (err: any) {
      const authUser = useAuthStore.getState().user;
      if (authUser) {
        setProfile({
          userId: authUser.id,
          citizenId: authUser.citizenId,
          fullName: authUser.fullName,
          email: authUser.email,
          userRole: authUser.role || 'TAXPAYER',
          isVerified: true,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        const msg = err.response?.data?.message || 'Không thể tải thông tin hồ sơ cá nhân.';
        setError(msg);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const handleEdit = (autoFocusTaxId = false) => {
    navigation.navigate('EditProfile', { autoFocusTaxId });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>HỒ SƠ CÁ NHÂN</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Đang tải hồ sơ cá nhân...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>HỒ SƠ CÁ NHÂN</Text>
        <TouchableOpacity style={styles.editHeaderBtn} onPress={() => handleEdit(false)}>
          <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchProfile(true)} colors={[theme.colors.primary]} />
        }
      >
        {/* Thẻ Avatar & Trạng thái xác thực */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{profile?.fullName || 'Người nộp thuế'}</Text>
          <View
            style={[
              styles.badge,
              profile?.isVerified ? styles.badgeVerified : styles.badgeUnverified,
            ]}
          >
            <Ionicons
              name={profile?.isVerified ? 'checkmark-circle' : 'alert-circle'}
              size={15}
              color={profile?.isVerified ? theme.colors.success : theme.colors.warning}
            />
            <Text
              style={[
                styles.badgeText,
                { color: profile?.isVerified ? theme.colors.success : theme.colors.warning },
              ]}
            >
              {profile?.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
            </Text>
          </View>
        </View>

        {/* Cảnh báo khi chưa xác thực */}
        {!profile?.isVerified && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={20} color={theme.colors.warning} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.warningTitle}>Tài khoản chưa được xác thực</Text>
              <Text style={styles.warningSubtitle}>
                Một số tính năng nâng cao có thể bị hạn chế cho đến khi tài khoản được xác thực.
              </Text>
            </View>
          </View>
        )}

        {/* Nhóm 1: Thông tin cá nhân */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>THÔNG TIN CÁ NHÂN</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Họ và tên</Text>
            <Text style={styles.fieldValue}>{profile?.fullName || 'Chưa cập nhật'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <View style={styles.labelWithIcon}>
              <Text style={styles.fieldLabel}>Số căn cước</Text>
              <Ionicons name="lock-closed" size={14} color={theme.colors.textSecondary} style={{ marginLeft: 4 }} />
            </View>
            <Text style={[styles.fieldValue, styles.monospace]}>{profile?.citizenId || 'Chưa cập nhật'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Ngày sinh</Text>
            <Text style={styles.fieldValue}>{profile?.dateOfBirth || 'Chưa cập nhật'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Địa chỉ</Text>
            <Text style={[styles.fieldValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
              {profile?.address || 'Chưa cập nhật'}
            </Text>
          </View>
        </View>

        {/* Nhóm 2: Thông tin tài khoản & Mã số thuế */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="card-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>THÔNG TIN TÀI KHOẢN</Text>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{profile?.email || 'Chưa cập nhật'}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Số điện thoại</Text>
            <Text style={styles.fieldValue}>{profile?.phoneNumber || 'Chưa cập nhật'}</Text>
          </View>

          <View style={styles.divider} />

          {/* Ô Mã số thuế - Điểm nhấn nghiệp vụ */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Mã số thuế</Text>
            {profile?.taxIdNumber ? (
              <View style={styles.taxIdBadge}>
                <Ionicons name="shield-checkmark" size={14} color={theme.colors.primary} />
                <Text style={styles.taxIdText}>{profile.taxIdNumber}</Text>
              </View>
            ) : (
              <View style={styles.taxIdEmptyRow}>
                <Text style={styles.emptyText}>Chưa có</Text>
                <TouchableOpacity
                  style={styles.addTaxBtn}
                  onPress={() => handleEdit(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Bổ sung mã số thuế"
                >
                  <Ionicons name="add" size={14} color="#FFFFFF" />
                  <Text style={styles.addTaxBtnText}>Bổ sung</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Nhóm 3: Liên kết nhanh theo đặc tả mục 6.3 */}
        <View style={styles.card}>
          <Text style={styles.quickLinksHeader}>LIÊN KẾT NHANH</Text>

          <TouchableOpacity
            style={styles.quickLinkRow}
            onPress={() => navigation.navigate('ChangePassword')}
            testID="quickLinkChangePassword"
          >
            <View style={styles.quickLinkLeft}>
              <Ionicons name="key-outline" size={18} color={theme.colors.textPrimary} />
              <Text style={styles.quickLinkText}>Đổi mật khẩu</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.quickLinkRow}
            onPress={() => navigation.navigate('DependentList')}
            testID="quickLinkDependentList"
          >
            <View style={styles.quickLinkLeft}>
              <Ionicons name="people-outline" size={18} color={theme.colors.textPrimary} />
              <Text style={styles.quickLinkText}>Người phụ thuộc & Giấy tờ minh chứng</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.quickLinkRow}
            onPress={() => navigation.navigate('IncomeSourceList')}
            testID="quickLinkIncomeSource"
          >
            <View style={styles.quickLinkLeft}>
              <Ionicons name="business-outline" size={18} color={theme.colors.textPrimary} />
              <Text style={styles.quickLinkText}>Nơi chi trả thu nhập</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Nút hành động Chỉnh sửa */}
        <TouchableOpacity
          style={styles.primaryEditBtn}
          activeOpacity={0.85}
          onPress={() => handleEdit(false)}
          accessibilityRole="button"
          accessibilityLabel="Chỉnh sửa hồ sơ"
        >
          <Ionicons name="create" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryEditBtnText}>Chỉnh sửa hồ sơ</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerTitle: {
    ...theme.typography.titleMedium,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  editHeaderBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  userCard: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    ...theme.shadows.button,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    ...theme.typography.titleLarge,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 5,
  },
  badgeVerified: {
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
  },
  badgeUnverified: {
    backgroundColor: 'rgba(237, 108, 2, 0.1)',
  },
  badgeText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  warningTitle: {
    ...theme.typography.bodyMedium,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 2,
  },
  warningSubtitle: {
    ...theme.typography.bodySmall,
    color: '#F57C00',
    lineHeight: 18,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    ...theme.typography.titleMedium,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primaryDark,
    letterSpacing: 0.5,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  labelWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
  },
  fieldValue: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  monospace: {
    letterSpacing: 0.5,
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#ECE7DE',
    marginVertical: 4,
  },
  taxIdBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.colors.borderFocus,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 6,
  },
  taxIdText: {
    ...theme.typography.bodyMedium,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  taxIdEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textPlaceholder,
    fontStyle: 'italic',
  },
  addTaxBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  addTaxBtnText: {
    ...theme.typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  quickLinksHeader: {
    ...theme.typography.titleMedium,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  quickLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  quickLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  quickLinkText: {
    ...theme.typography.bodyMedium,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  primaryEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 14,
    marginTop: 4,
    ...theme.shadows.button,
  },
  primaryEditBtnText: {
    ...theme.typography.bodyLarge,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
