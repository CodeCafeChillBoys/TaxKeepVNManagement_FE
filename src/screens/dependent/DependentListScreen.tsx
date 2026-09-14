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
import { RootNavigationProp } from '../../navigation/types';
import {
  dependentDocumentApi,
  DependentItem,
} from '../../api/dependentDocumentApi';

// Mức giảm trừ gia cảnh cho mỗi người phụ thuộc theo Nghị quyết 110/2025/UBTVQH15 (áp dụng từ 01/01/2026)
const DEDUCTION_PER_DEPENDENT = 6200000; // 6.200.000 VNĐ/tháng

export const DependentListScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const [dependents, setDependents] = useState<DependentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchDependents = useCallback(async () => {
    try {
      const data = await dependentDocumentApi.getDependents();
      setDependents(data);
    } catch (err: any) {
      console.warn('fetchDependents error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDependents();
    }, [fetchDependents])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDependents();
  };

  const getRelationshipLabel = (rel?: string) => {
    switch (rel) {
      case 'CHILD':
        return 'Con';
      case 'SPOUSE':
        return 'Vợ / Chồng';
      case 'PARENT':
        return 'Cha / Mẹ';
      case 'OTHER_DEPENDENT':
        return 'Cá nhân khác';
      default:
        return 'Người phụ thuộc';
    }
  };

  const calculateAge = (birthDateStr?: string): number => {
    if (!birthDateStr) return 0;
    try {
      const birth = new Date(birthDateStr);
      if (isNaN(birth.getTime())) return 0;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return Math.max(0, age);
    } catch {
      return 0;
    }
  };

  const getGroupIndex = (currentGroup?: string): number => {
    switch (currentGroup) {
      case 'CHILD_UNDER_18':
        return 0;
      case 'CHILD_OVER_18_STUDYING':
      case 'CHILD_STUDYING':
        return 1;
      case 'CHILD_OVER_18_DISABLED':
      case 'DISABLED_DEPENDENT':
        return 2;
      case 'SPOUSE_RETIRED':
      case 'SPOUSE_DISABLED':
      case 'PARENT_RETIRED':
      case 'PARENT_DISABLED':
      case 'SPOUSE_OR_PARENTS':
        return 3;
      case 'OTHER_HELPLESS':
      case 'OTHER_DEPENDENT':
        return 4;
      default:
        return 0;
    }
  };

  const handleGoToProofDocuments = (dep: DependentItem) => {
    const groupIdx = getGroupIndex(dep.currentGroup);
    navigation.navigate('ProofDocuments', {
      groupIndex: groupIdx,
      dependentId: dep.id,
      dependentData: {
        fullName: dep.fullName,
        citizenId: dep.citizenId || '',
        birthCertNumber: dep.birthCertNumber || '',
        dateOfBirth: dep.birthDate,
        relationship: dep.relationship || 'CHILD',
        effectiveFromMonth: dep.effectiveFromMonth || '2026-01',
        effectiveToMonth: dep.effectiveToMonth || '2026-12',
        groupId: groupIdx + 1,
        groupCode: dep.currentGroup,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header chuẩn màu sắc thương hiệu */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          testID="dependentListBackBtn"
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Danh sách người phụ thuộc
        </Text>
        <TouchableOpacity
          style={styles.addHeaderBtn}
          onPress={() => navigation.navigate('TaxRegistration')}
          accessibilityRole="button"
          accessibilityLabel="Thêm người phụ thuộc"
          testID="btnAddDependentHeader"
        >
          <Ionicons name="person-add" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Banner Tổng quan Giảm trừ gia cảnh theo Nghị quyết 110/2025/UBTVQH15 */}
        <View style={styles.summaryBanner}>
          <View style={styles.summaryTextCol}>
            <Text style={styles.summaryLabel}>GIẢM TRỪ GIA CẢNH NPT</Text>
            <Text style={styles.summaryCount}>
              {dependents.length}{' '}
              <Text style={styles.summaryCountUnit}>người phụ thuộc</Text>
            </Text>
            <Text style={styles.summaryDeductionAmount}>
              Ước tính:{' '}
              <Text style={styles.summaryHighlight}>
                {(dependents.length * DEDUCTION_PER_DEPENDENT).toLocaleString('vi-VN')} đ/tháng
              </Text>
            </Text>
            <Text style={styles.summaryLawSubtext}>
              (6,2 tr đ/tháng/người - NQ 110/2025/UBTVQH15)
            </Text>
          </View>
          <View style={styles.summaryIconBox}>
            <Ionicons name="people" size={32} color={theme.colors.gold} />
          </View>
        </View>

        {/* Tiêu đề danh sách & nút Đăng ký */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hồ sơ đã khai báo ({dependents.length})</Text>
          <TouchableOpacity
            style={styles.addNewInlineBtn}
            onPress={() => navigation.navigate('TaxRegistration')}
            testID="btnAddNewDependentInline"
          >
            <Ionicons name="add-circle" size={16} color={theme.colors.primary} />
            <Text style={styles.addNewInlineBtnText}>Khai báo mới</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Đang tải danh sách người phụ thuộc...</Text>
          </View>
        ) : dependents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="people-outline" size={48} color={theme.colors.textPlaceholder} />
            </View>
            <Text style={styles.emptyTitle}>Chưa có người phụ thuộc</Text>
            <Text style={styles.emptySubtitle}>
              Bạn chưa đăng ký người phụ thuộc nào để được hưởng mức giảm trừ gia cảnh 6.200.000 VNĐ/tháng (theo Nghị quyết 110/2025/UBTVQH15 áp dụng từ năm 2026).
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => navigation.navigate('TaxRegistration')}
              testID="btnEmptyAddDependent"
            >
              <Ionicons name="person-add-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyAddBtnText}>Đăng ký người phụ thuộc ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          dependents.map((dep) => {
            const age = calculateAge(dep.birthDate);
            const isAdult = age >= 14;
            const hasCitizenId = Boolean(dep.citizenId);

            return (
              <View key={dep.id} style={styles.cardItem}>
                {/* Header thẻ */}
                <View style={styles.cardTopRow}>
                  <View style={styles.avatarBox}>
                    <Ionicons
                      name={dep.relationship === 'CHILD' ? 'happy' : 'person'}
                      size={22}
                      color="#FFFFFF"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{dep.fullName}</Text>
                    <View style={styles.badgesRow}>
                      <View style={styles.relationBadge}>
                        <Text style={styles.relationBadgeText}>
                          {getRelationshipLabel(dep.relationship)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          dep.isProfileComplete ? styles.statusComplete : styles.statusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            dep.isProfileComplete
                              ? styles.statusCompleteText
                              : styles.statusPendingText,
                          ]}
                        >
                          {dep.isProfileComplete ? '✓ Đủ hồ sơ' : 'Chờ bổ sung minh chứng'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Phân cách nhẹ */}
                <View style={styles.cardDivider} />

                {/* Chi tiết người phụ thuộc */}
                <View style={styles.cardDetails}>
                  {/* Ngày sinh & Độ tuổi */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ngày sinh & Độ tuổi:</Text>
                    <Text style={styles.detailValue}>
                      {dep.birthDate} ({age} tuổi)
                    </Text>
                  </View>

                  {/* Định danh: CCCD (nếu >= 14 tuổi) hoặc Giấy khai sinh (nếu < 14 tuổi) */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {isAdult || hasCitizenId ? 'Số Căn cước công dân:' : 'Số Giấy khai sinh:'}
                    </Text>
                    <Text style={[styles.detailValue, styles.monospace]}>
                      {dep.citizenId || dep.birthCertNumber || 'Chưa cập nhật'}
                    </Text>
                  </View>

                  {/* Nhóm điều kiện */}
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Nhóm điều kiện:</Text>
                    <Text style={[styles.detailValue, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                      {dep.groupTitle}
                    </Text>
                  </View>

                  {/* Thời gian hiệu lực */}
                  {(dep.effectiveFromMonth || dep.effectiveToMonth) && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Thời gian hiệu lực:</Text>
                      <Text style={styles.detailValue}>
                        {dep.effectiveFromMonth || '01/2026'} → {dep.effectiveToMonth || '12/2026'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Nút hành động */}
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    style={styles.uploadProofBtn}
                    onPress={() => handleGoToProofDocuments(dep)}
                    activeOpacity={0.8}
                    testID={`btnProofDoc_${dep.id}`}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={16}
                      color={theme.colors.primary}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.uploadProofBtnText}>
                      {dep.isProfileComplete ? 'Xem / Cập nhật minh chứng' : 'Bổ sung ảnh minh chứng'}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

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
    paddingVertical: 12,
    backgroundColor: '#FAF5EA',
    borderBottomWidth: 1,
    borderBottomColor: '#EBE2D3',
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    textAlign: 'center',
  },
  addHeaderBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  summaryBanner: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
    ...theme.shadows.button,
  },
  summaryTextCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.goldLight,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  summaryCountUnit: {
    fontSize: 14,
    fontWeight: '400',
    color: '#E0E0E0',
  },
  summaryDeductionAmount: {
    fontSize: 12,
    color: '#D0D0D0',
  },
  summaryHighlight: {
    fontWeight: '700',
    color: theme.colors.goldLight,
  },
  summaryLawSubtext: {
    fontSize: 11,
    color: '#E0D0B0',
    marginTop: 3,
    fontStyle: 'italic',
  },
  summaryIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  addNewInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  addNewInlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 30,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    ...theme.shadows.button,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  relationBadge: {
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  relationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusComplete: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusCompleteText: {
    color: '#2E7D32',
  },
  statusPendingText: {
    color: '#E65100',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F0F2',
    marginVertical: 12,
  },
  cardDetails: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  monospace: {
    fontFamily: 'monospace',
    letterSpacing: 0.5,
  },
  cardActionRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F2',
    paddingTop: 10,
    alignItems: 'flex-end',
  },
  uploadProofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF0E8',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 2,
  },
  uploadProofBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});
