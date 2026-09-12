import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { RootNavigationProp } from '../../navigation/types';
import { dependentDocumentApi } from '../../api/dependentDocumentApi';

/**
 * Màn hình: Điều kiện đăng kí (Figma Frame: iPhone 17 - 14)
 * Thiết kế chuẩn Figma:
 * - Header màu hoa văn trống đồng vàng be: "Điều kiện đăng kí"
 * - Hiển thị chi tiết toàn bộ 5 nhóm quy định luật và giấy tờ bắt buộc upload
 * - Không có thanh tìm kiếm, không có banner tự tạo, không có tab nhóm tùy biến
 */

interface LawConditionSection {
  id: number;
  groupTitle: string;
  logicCondition?: string;
  includesText?: string;
  docs: {
    code: string;
    text: string;
    subItems?: string[];
  }[];
}

const LAW_SECTIONS: LawConditionSection[] = [
  {
    id: 1,
    groupTitle: 'Nhóm 1: Con dưới 18 tuổi',
    logicCondition: 'Độ tuổi tính theo ngày sinh < 18 tuổi.',
    docs: [
      {
        code: 'a',
        text: 'Giấy khai sinh của con (hoặc bản trích lục khai sinh).',
      },
      {
        code: 'b',
        text: 'Căn cước công dân / Mã định danh cá nhân của con (nếu đã được cấp).',
      },
    ],
  },
  {
    id: 2,
    groupTitle: 'Nhóm 2: Con từ 18 tuổi trở lên đang đi học',
    logicCondition: 'Độ tuổi < 18 tuổi và còn đang theo học các bậc giáo dục.',
    docs: [
      {
        code: 'a',
        text: 'Căn cước công dân của con.',
      },
      {
        code: 'b',
        text: 'Giấy khai sinh của con (chứng minh quan hệ).',
      },
      {
        code: 'c',
        text: 'Thẻ sinh viên (còn hạn) hoặc Giấy xác nhận học sinh/sinh viên từ trường đại học, cao đẳng, trung cấp, học nghề.',
      },
    ],
  },
  {
    id: 3,
    groupTitle: 'Nhóm 3: Con bị khuyết tật / Mất khả năng lao động (≥ 18 tuổi)',
    logicCondition: 'Con đủ 18 tuổi trở lên nhưng không có khả năng tự lao động tạo thu nhập.',
    docs: [
      {
        code: 'a',
        text: 'Căn cước công dân của con.',
      },
      {
        code: 'b',
        text: 'Giấy khai sinh của con.',
      },
      {
        code: 'c',
        text: 'Giấy xác nhận mức độ khuyết tật (do UBND cấp xã cấp) hoặc Biên bản giám định y khoa mất khả năng lao động.',
      },
    ],
  },
  {
    id: 4,
    groupTitle: 'Nhóm 4: Vợ / Chồng hoặc Cha / Mẹ',
    includesText: 'Vợ, chồng; cha mẹ đẻ, cha mẹ vợ/chồng, cha mẹ kế, cha mẹ nuôi hợp pháp.',
    docs: [
      {
        code: 'a',
        text: 'Căn cước công dân của người phụ thuộc (cha/mẹ hoặc vợ/chồng).',
      },
      {
        code: 'b',
        text: 'Giấy tờ chứng minh quan hệ:',
        subItems: [
          'Nếu là Vợ/Chồng: Giấy chứng nhận kết hôn.',
          'Nếu là Cha mẹ đẻ: Giấy khai sinh của người nộp thuế.',
          'Nếu là Cha mẹ vợ/chồng: Giấy kết hôn của NNT + Giấy khai sinh của vợ/chồng.',
          'Nếu là Cha mẹ nuôi: Quyết định công nhận việc nuôi con nuôi.',
        ],
      },
      {
        code: 'c',
        text: 'Giấy tờ chứng minh điều kiện giảm trừ:',
        subItems: [
          'Nếu ngoài độ tuổi lao động: Bản cam kết không có thu nhập (hoặc thu nhập dưới ngưỡng luật định).',
          'Nếu trong độ tuổi lao động: Giấy xác nhận khuyết tật / mất khả năng lao động.',
        ],
      },
    ],
  },
  {
    id: 5,
    groupTitle: 'Nhóm 5: Cá nhân không nơi nương tựa khác',
    includesText: 'Anh, chị, em ruột; ông bà nội/ngoại; cô dì chú bác ruột; cháu ruột.',
    docs: [
      {
        code: 'a',
        text: 'Căn cước công dân / Giấy khai sinh của người phụ thuộc.',
      },
      {
        code: 'b',
        text: 'Giấy tờ chứng minh quan hệ huyết thống (Giấy khai sinh các bên, thông tin cư trú chứng minh cùng dòng họ).',
      },
      {
        code: 'c',
        text: 'Văn bản xác nhận của UBND cấp xã nơi cư trú xác nhận người nộp thuế đang trực tiếp nuôi dưỡng và người phụ thuộc không còn ai khác phụ dưỡng.',
      },
      {
        code: 'd',
        text: 'Giấy tờ điều kiện lao động:',
        subItems: [
          'Nếu trong độ tuổi lao động: Giấy xác nhận khuyết tật/ mất khả năng lao động.',
          'Nếu ngoài độ tuổi lao động: Bản cam kết không có thu nhập hợp lệ.',
        ],
      },
    ],
  },
];

export const LawConditionsScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const [sections, setSections] = useState<LawConditionSection[]>(LAW_SECTIONS);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const rules = await dependentDocumentApi.getRules();
      if (rules && rules.length > 0) {
        const updated = LAW_SECTIONS.map((sec) => {
          let matchedRules = rules.filter((r) => {
            if (sec.id === 1) return r.targetGroup === 'CHILD_UNDER_18';
            if (sec.id === 2) return r.targetGroup === 'CHILD_STUDYING';
            if (sec.id === 3) return r.targetGroup === 'CHILD_DISABLED';
            if (sec.id === 4) return r.targetGroup === 'SPOUSE' || r.targetGroup === 'PARENT' || r.targetGroup === 'PARENT_IN_LAW';
            if (sec.id === 5) return r.targetGroup === 'OTHER_HELPLESS';
            return false;
          });

          if (matchedRules.length > 0) {
            return {
              ...sec,
              docs: matchedRules.map((r, i) => ({
                code: String.fromCharCode(97 + i),
                text: `${r.description || r.docType}${r.isMandatory ? ' (Bắt buộc)' : ' (Tùy chọn)'}`,
              })),
            };
          }
          return sec;
        });
        setSections(updated);
      }
    } catch (err) {
      console.warn('loadRules err in LawConditionsScreen:', err);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header chuẩn Figma: Nền hoa văn vàng be + Tiêu đề "Điều kiện đăng kí" */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          testID="lawConditionsBackBtn"
        >
          <Ionicons name="arrow-back" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Điều kiện đăng kí
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Nội dung văn bản pháp luật cuộn mượt chuẩn iPhone 17 - 14 */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((sec) => (
          <View key={sec.id} style={styles.sectionCard}>
            {/* Tiêu đề nhóm */}
            <Text style={styles.groupTitle}>{sec.groupTitle}</Text>

            {/* Điều kiện logic (Nhóm 1, 2, 3) */}
            {sec.logicCondition && (
              <Text style={styles.logicText}>
                -Điều kiện logic: {sec.logicCondition}
              </Text>
            )}

            {/* Bao gồm đối tượng (Nhóm 4, 5) */}
            {sec.includesText && (
              <Text style={styles.includesText}>
                -Bao gồm: {sec.includesText}
              </Text>
            )}

            {/* Danh mục tài liệu bắt buộc upload */}
            <Text style={styles.docsHeader}>-Tài liệu bắt buộc upload:</Text>
            <View style={styles.docsList}>
              {sec.docs.map((doc) => (
                <View key={doc.code} style={styles.docItem}>
                  <Text style={styles.docItemText}>
                    {doc.code}. {doc.text}
                  </Text>

                  {/* Các gạch đầu dòng chi tiết bên dưới mục b, c, d */}
                  {doc.subItems && (
                    <View style={styles.subItemsContainer}>
                      {doc.subItems.map((sub, sIdx) => (
                        <View key={sIdx} style={styles.subItemRow}>
                          <Text style={styles.bulletDot}>•</Text>
                          <Text style={styles.subItemText}>{sub}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#EBE4D5',
  },
  header: {
    height: 60,
    backgroundColor: '#EBE4D5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD5C4',
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...theme.typography.titleLarge,
    flex: 1,
    fontSize: 19,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  sectionCard: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    lineHeight: 22,
    marginBottom: 4,
  },
  logicText: {
    fontSize: 13.5,
    fontWeight: '400',
    color: '#1A1A1A',
    lineHeight: 20,
    marginBottom: 2,
  },
  includesText: {
    fontSize: 13.5,
    fontWeight: '400',
    color: '#1A1A1A',
    lineHeight: 20,
    marginBottom: 2,
  },
  docsHeader: {
    fontSize: 13.5,
    fontWeight: '400',
    color: '#1A1A1A',
    lineHeight: 20,
    marginBottom: 2,
  },
  docsList: {
    paddingLeft: 12,
  },
  docItem: {
    marginTop: 3,
    marginBottom: 4,
  },
  docItemText: {
    fontSize: 13.5,
    fontWeight: '400',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  subItemsContainer: {
    paddingLeft: 14,
    marginTop: 3,
    marginBottom: 4,
  },
  subItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  bulletDot: {
    fontSize: 14,
    color: '#1A1A1A',
    marginRight: 6,
    lineHeight: 19,
  },
  subItemText: {
    flex: 1,
    fontSize: 13,
    color: '#333333',
    lineHeight: 19,
  },
});
