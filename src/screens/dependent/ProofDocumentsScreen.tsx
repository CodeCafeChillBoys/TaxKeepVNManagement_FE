import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { theme } from '../../constants/theme';
import {
  dependentDocumentApi,
  DependentItem,
  DependentDocumentRuleItem,
  getDocTypeLabel,
} from '../../api/dependentDocumentApi';
import { RootStackParamList, RootNavigationProp } from '../../navigation/types';

type ProofDocumentsRouteProp = RouteProp<RootStackParamList, 'ProofDocuments'>;

interface LawDocItem {
  key: string;
  code: string;
  docType: string;
  title: string;
  lawExplanation?: string;
}

interface LawGroupRequirement {
  groupId: number;
  code: string;
  tabLabel: string;
  title: string;
  subtitle: string;
  docs: LawDocItem[];
}

const LAW_GROUP_SPECS: LawGroupRequirement[] = [
  {
    groupId: 1,
    code: 'CHILD_UNDER_18',
    tabLabel: 'Nhóm 1',
    title: 'Nhóm 1: Con dưới 18 tuổi',
    subtitle: 'Độ tuổi tính theo ngày sinh < 18 tuổi.',
    docs: [
      {
        key: 'g1_birth',
        code: 'a',
        docType: 'BIRTH_CERTIFICATE',
        title: 'a. Giấy khai sinh của con (hoặc bản trích lục khai sinh).',
      },
      {
        key: 'g1_cccd',
        code: 'b',
        docType: 'CITIZEN_ID',
        title: 'b. Căn cước công dân / Mã định danh cá nhân của con (nếu đã được cấp).',
      },
    ],
  },
  {
    groupId: 2,
    code: 'CHILD_OVER_18_STUDYING',
    tabLabel: 'Nhóm 2',
    title: 'Nhóm 2: Con từ 18 tuổi trở lên đang đi học',
    subtitle: 'Độ tuổi < 18 tuổi và còn đang theo học các bậc giáo dục.',
    docs: [
      {
        key: 'g2_cccd',
        code: 'a',
        docType: 'CITIZEN_ID',
        title: 'a. Căn cước công dân của con.',
      },
      {
        key: 'g2_birth',
        code: 'b',
        docType: 'BIRTH_CERTIFICATE',
        title: 'b. Giấy khai sinh của con (chứng minh quan hệ).',
      },
      {
        key: 'g2_student',
        code: 'c',
        docType: 'STUDENT_CARD',
        title:
          'c. Thẻ sinh viên (còn hạn) hoặc Giấy xác nhận học sinh/sinh viên từ trường đại học, cao đẳng, trung cấp, học nghề.',
      },
    ],
  },
  {
    groupId: 3,
    code: 'DISABLED_DEPENDENT',
    tabLabel: 'Nhóm 3',
    title: 'Nhóm 3: Con bị khuyết tật / Mất khả năng lao động',
    subtitle: 'Con đủ 18 tuổi trở lên nhưng không có khả năng tự lao động tạo thu nhập.',
    docs: [
      {
        key: 'g3_cccd',
        code: 'a',
        docType: 'CITIZEN_ID',
        title: 'a. Căn cước công dân của con.',
      },
      {
        key: 'g3_birth',
        code: 'b',
        docType: 'BIRTH_CERTIFICATE',
        title: 'b. Giấy khai sinh của con.',
      },
      {
        key: 'g3_disability',
        code: 'c',
        docType: 'DISABILITY_CERTIFICATE',
        title:
          'c. Giấy xác nhận mức độ khuyết tật (do UBND cấp xã cấp) hoặc Biên bản giám định y khoa mất khả năng lao động.',
      },
    ],
  },
  {
    groupId: 4,
    code: 'SPOUSE_OR_PARENTS',
    tabLabel: 'Nhóm 4',
    title: 'Nhóm 4: Vợ / Chồng hoặc Cha / Mẹ',
    subtitle: 'Bao gồm: Vợ, chồng; cha mẹ đẻ, cha mẹ vợ/chồng, cha mẹ kế, cha mẹ nuôi hợp pháp.',
    docs: [
      {
        key: 'g4_cccd',
        code: 'a',
        docType: 'CITIZEN_ID',
        title: 'a. Căn cước công dân của người phụ thuộc (cha/mẹ hoặc vợ/chồng).',
      },
      {
        key: 'g4_relation',
        code: 'b',
        docType: 'MARRIAGE_CERTIFICATE',
        title: 'b. Giấy tờ chứng minh quan hệ:',
        lawExplanation:
          '- Nếu là Vợ/Chồng: Giấy chứng nhận kết hôn.\n- Nếu là Cha mẹ đẻ: Giấy khai sinh của người nộp thuế.\n- Nếu là Cha mẹ vợ/chồng: Giấy kết hôn của NNT + Giấy khai sinh của vợ/chồng.\n- Nếu là Cha mẹ nuôi: Quyết định công nhận việc nuôi con nuôi.',
      },
      {
        key: 'g4_condition',
        code: 'c',
        docType: 'DISABILITY_CERTIFICATE',
        title: 'c. Giấy tờ chứng minh điều kiện giảm trừ:',
        lawExplanation:
          '- Nếu ngoài độ tuổi lao động: Bản cam kết không có thu nhập (hoặc thu nhập dưới ngưỡng luật định).\n- Nếu trong độ tuổi lao động: Giấy xác nhận khuyết tật hoặc Kết luận giám định mất khả năng lao động.',
      },
    ],
  },
  {
    groupId: 5,
    code: 'OTHER_DEPENDENT',
    tabLabel: 'Nhóm 5',
    title: 'Nhóm 5: Cá nhân khác không nơi nương tựa trực tiếp nuôi dưỡng',
    subtitle: 'Bao gồm: Anh, chị, em ruột; ông bà nội/ngoại; cô dì chú bác ruột; cháu ruột.',
    docs: [
      {
        key: 'g5_cccd_or_birth',
        code: 'a',
        docType: 'CITIZEN_ID',
        title: 'a. Căn cước công dân / Giấy khai sinh của người phụ thuộc.',
      },
      {
        key: 'g5_blood_relation',
        code: 'b',
        docType: 'RELATIONSHIP_CERTIFICATE',
        title:
          'b. Giấy tờ chứng minh quan hệ huyết thống (Giấy khai sinh các bên, thông tin cư trú chứng minh cùng dòng họ).',
      },
      {
        key: 'g5_ubnd_cert',
        code: 'c',
        docType: 'SUPPORT_COMMITMENT_FORM',
        title:
          'c. Văn bản xác nhận của UBND cấp xã nơi cư trú xác nhận người nộp thuế đang trực tiếp nuôi dưỡng và người phụ thuộc không còn ai khác phụ dưỡng.',
      },
      {
        key: 'g5_labor_condition',
        code: 'd',
        docType: 'DISABILITY_CERTIFICATE',
        title: 'd. Giấy tờ điều kiện lao động:',
        lawExplanation:
          '- Nếu trong độ tuổi lao động: Giấy xác nhận khuyết tật/ mất khả năng lao động.\n- Nếu ngoài độ tuổi lao động: Bản cam kết không có thu nhập hợp lệ.',
      },
    ],
  },
];

export const ProofDocumentsScreen: React.FC = () => {
  const navigation = useNavigation<RootNavigationProp>();
  const route = useRoute<ProofDocumentsRouteProp>();

  const initialGroupIdx =
    typeof route.params?.groupIndex === 'number' &&
    route.params.groupIndex >= 0 &&
    route.params.groupIndex < LAW_GROUP_SPECS.length
      ? route.params.groupIndex
      : 0;

  const [selectedGroupIdx, setSelectedGroupIdx] = useState<number>(initialGroupIdx);

  useEffect(() => {
    if (
      typeof route.params?.groupIndex === 'number' &&
      route.params.groupIndex >= 0 &&
      route.params.groupIndex < LAW_GROUP_SPECS.length
    ) {
      setSelectedGroupIdx(route.params.groupIndex);
    }
  }, [route.params?.groupIndex]);

  const [dependents, setDependents] = useState<DependentItem[]>([]);
  const [selectedDependent, setSelectedDependent] = useState<DependentItem | null>(null);

  // Lưu trữ tệp được chọn theo từng mục document key
  const [selectedFiles, setSelectedFiles] = useState<
    Record<
      string,
      {
        name: string;
        sizeText: string;
        type: string;
        blob?: Blob | File;
        uri?: string;
      }
    >
  >({});

  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadedKeys, setUploadedKeys] = useState<Record<string, boolean>>({});

  // State cho Modal chọn nguồn ảnh/tệp thực tế
  const [pickerModalVisible, setPickerModalVisible] = useState<boolean>(false);
  const [activePickingDoc, setActivePickingDoc] = useState<{
    key: string;
    title: string;
    docType: string;
  } | null>(null);

  // State cho Modal đọc chi tiết luật khi bấm dấu chấm than (!)
  const [lawModalVisible, setLawModalVisible] = useState<boolean>(false);
  const [lawModalData, setLawModalData] = useState<{
    title: string;
    content: string;
  } | null>(null);

  const handleOpenLawModal = (title: string, content: string) => {
    setLawModalData({ title, content });
    setLawModalVisible(true);
  };

  const [allRules, setAllRules] = useState<DependentDocumentRuleItem[]>([]);
  const [dynamicDocs, setDynamicDocs] = useState<LawDocItem[] | null>(null);

  const currentGroupSpec = LAW_GROUP_SPECS[selectedGroupIdx];
  const activeDocs = dynamicDocs && dynamicDocs.length > 0 ? dynamicDocs : currentGroupSpec.docs;

  useEffect(() => {
    loadInitialData();
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const rules = await dependentDocumentApi.getRules();
      if (rules && rules.length > 0) {
        setAllRules(rules);
      }
    } catch (err) {
      console.warn('loadRules err:', err);
    }
  };

  // Cập nhật danh sách tài liệu động theo quy tắc từ Backend API
  useEffect(() => {
    if (allRules.length === 0) return;

    const rel = (route.params?.dependentData as any)?.relationship;
    let targetGroup = 'CHILD_UNDER_18';

    if (selectedGroupIdx === 0) {
      targetGroup = 'CHILD_UNDER_18';
    } else if (selectedGroupIdx === 1) {
      targetGroup = 'CHILD_STUDYING';
    } else if (selectedGroupIdx === 2) {
      targetGroup = 'CHILD_DISABLED';
    } else if (selectedGroupIdx === 3) {
      if (rel === 'SPOUSE') targetGroup = 'SPOUSE';
      else if (rel === 'PARENT_IN_LAW') targetGroup = 'PARENT_IN_LAW';
      else targetGroup = 'PARENT';
    } else if (selectedGroupIdx === 4) {
      targetGroup = 'OTHER_HELPLESS';
    }

    // Lọc các rule tương ứng với nhóm
    let filteredRules = allRules.filter(
      (r) => r.targetGroup.toUpperCase() === targetGroup.toUpperCase()
    );

    // Fallback nếu không có kết quả chính xác theo tên nhóm mới
    if (filteredRules.length === 0) {
      if (selectedGroupIdx === 1) {
        filteredRules = allRules.filter((r) => r.targetGroup.includes('STUDY'));
      } else if (selectedGroupIdx === 2) {
        filteredRules = allRules.filter((r) => r.targetGroup.includes('DISABLE'));
      } else if (selectedGroupIdx === 3) {
        filteredRules = allRules.filter((r) => r.targetGroup === 'PARENT' || r.targetGroup === 'SPOUSE');
      }
    }

    if (filteredRules.length > 0) {
      const docs: LawDocItem[] = filteredRules.map((rule, idx) => {
        const letter = String.fromCharCode(97 + idx); // a, b, c, d...
        const label = getDocTypeLabel(rule.docType);
        const mandatoryBadge = rule.isMandatory ? ' (Bắt buộc)' : ' (Tùy chọn)';
        return {
          key: `rule_${rule.docType.toLowerCase()}`,
          code: letter,
          docType: rule.docType,
          title: `${letter}. ${label}${mandatoryBadge}`,
          lawExplanation: rule.description || undefined,
        };
      });
      setDynamicDocs(docs);
    }
  }, [allRules, selectedGroupIdx, route.params?.dependentData]);

  const loadInitialData = async () => {
    try {
      const deps = await dependentDocumentApi.getDependents();
      setDependents(deps);
      if (deps.length > 0) {
        const matched = deps.find((d) => d.currentGroup === currentGroupSpec.code);
        setSelectedDependent(matched || deps[0]);
      }
    } catch {
      // Fallback
    }
  };

  // Mở menu chọn nguồn ảnh thật khi bấm vào ô
  const handleOpenDocPicker = (docKey: string, docTitle: string, docType: string) => {
    if (Platform.OS === 'web') {
      // Trình duyệt web: mở input file trực tiếp
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,application/pdf';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          if (file.size > 10 * 1024 * 1024) {
            window.alert('Dung lượng tệp vượt quá giới hạn 10MB.');
            return;
          }
          const sizeKb = Math.round(file.size / 1024);
          const sizeText = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

          setSelectedFiles((prev) => ({
            ...prev,
            [docKey]: {
              name: file.name,
              sizeText,
              type: file.type || 'application/pdf',
              blob: file,
            },
          }));
        }
      };
      input.click();
    } else {
      // Điện thoại Android / iOS: hiển thị Modal chọn Camera, Thư viện ảnh, hoặc File PDF
      setActivePickingDoc({ key: docKey, title: docTitle, docType });
      setPickerModalVisible(true);
    }
  };

  // 1. Chụp ảnh thật bằng Camera
  const handleLaunchCamera = async () => {
    setPickerModalVisible(false);
    if (!activePickingDoc) return;

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cấp quyền Camera', 'Vui lòng cho phép ứng dụng truy cập Camera để chụp ảnh giấy tờ minh chứng.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `chup_${activePickingDoc.docType.toLowerCase()}_${Date.now().toString().slice(-4)}.jpg`;
        const sizeText = asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : '1.4 MB';

        setSelectedFiles((prev) => ({
          ...prev,
          [activePickingDoc.key]: {
            name: fileName,
            sizeText,
            type: asset.mimeType || 'image/jpeg',
            uri: asset.uri,
          },
        }));
      }
    } catch (err: any) {
      Alert.alert('Lỗi chụp ảnh', err.message || 'Không thể khởi động Camera.');
    }
  };

  // 2. Chọn ảnh thật từ Thư viện (Gallery)
  const handleLaunchGallery = async () => {
    setPickerModalVisible(false);
    if (!activePickingDoc) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Cấp quyền Thư viện ảnh', 'Vui lòng cho phép ứng dụng truy cập Thư viện ảnh để chọn chứng từ.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `anh_${activePickingDoc.docType.toLowerCase()}_${Date.now().toString().slice(-4)}.jpg`;
        const sizeText = asset.fileSize ? `${Math.round(asset.fileSize / 1024)} KB` : '1.2 MB';

        setSelectedFiles((prev) => ({
          ...prev,
          [activePickingDoc.key]: {
            name: fileName,
            sizeText,
            type: asset.mimeType || 'image/jpeg',
            uri: asset.uri,
          },
        }));
      }
    } catch (err: any) {
      Alert.alert('Lỗi thư viện ảnh', err.message || 'Không thể mở thư viện ảnh.');
    }
  };

  // 3. Chọn tệp PDF hoặc tài liệu từ máy
  const handleLaunchDocument = async () => {
    setPickerModalVisible(false);
    if (!activePickingDoc) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const sizeKb = asset.size ? Math.round(asset.size / 1024) : 380;
        const sizeText = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

        setSelectedFiles((prev) => ({
          ...prev,
          [activePickingDoc.key]: {
            name: asset.name,
            sizeText,
            type: asset.mimeType || 'application/pdf',
            uri: asset.uri,
          },
        }));
      }
    } catch (err: any) {
      Alert.alert('Lỗi chọn tệp', err.message || 'Không thể chọn tệp tài liệu.');
    }
  };

  // Lưu thông tin hồ sơ người phụ thuộc & giấy tờ minh chứng (thay thế Quét thông minh)
  const handleSaveAndContinue = async () => {
    const activeDocKeys = activeDocs.map((d) => d.key);
    const entriesToUpload = Object.entries(selectedFiles).filter(([k]) => activeDocKeys.includes(k));

    const dependentId =
      route.params?.dependentId ||
      (route.params?.dependentData as any)?.id ||
      selectedDependent?.id;

    if (!dependentId) {
      Alert.alert('Chưa có hồ sơ', 'Không tìm thấy thông tin hồ sơ người phụ thuộc để lưu.');
      return;
    }

    try {
      setUploading(true);
      let uploadCount = 0;

      for (const [key, fileObj] of entriesToUpload) {
        const docSpec = activeDocs.find((d) => d.key === key);
        const docType = docSpec?.docType || 'BIRTH_CERTIFICATE';

        // Gọi API DependentDocument uploadDocument
        await dependentDocumentApi.uploadDocument(dependentId, docType, fileObj);
        uploadCount++;
        setUploadedKeys((prev) => ({ ...prev, [key]: true }));
      }

      setUploading(false);

      const msg = uploadCount > 0
        ? `Đã lưu hồ sơ và tải lên thành công ${uploadCount} giấy tờ minh chứng!`
        : 'Đã lưu thông tin hồ sơ người phụ thuộc thành công!';

      Alert.alert('Thành công', msg, [
        {
          text: 'Xem danh sách người phụ thuộc',
          onPress: () => {
            navigation.navigate('DependentList');
          },
        },
      ]);
    } catch (err: any) {
      setUploading(false);
      Alert.alert('Lỗi lưu giấy tờ minh chứng', err?.message || 'Không thể tải lên giấy tờ minh chứng. Vui lòng thử lại.');
    }
  };

  // Nộp hồ sơ minh chứng lên Backend API
  const handleUploadAll = async () => {
    const activeDocKeys = activeDocs.map((d) => d.key);
    const chosenEntries = Object.entries(selectedFiles).filter(([k]) => activeDocKeys.includes(k));

    if (chosenEntries.length === 0) {
      Alert.alert('Chưa chọn ảnh minh chứng', 'Vui lòng bấm vào ô khung bên dưới để chụp ảnh hoặc chọn tệp minh chứng.');
      return;
    }

    const dependentId =
      route.params?.dependentId ||
      (route.params?.dependentData as any)?.id ||
      selectedDependent?.id;

    if (!dependentId) {
      Alert.alert('Chưa có hồ sơ', 'Không tìm thấy hồ sơ người phụ thuộc để tải lên.');
      return;
    }

    try {
      setUploading(true);
      let lastRes: any = null;

      // Upload từng tệp lên Backend API thật
      for (const [key, fileObj] of chosenEntries) {
        const docSpec = activeDocs.find((d) => d.key === key);
        const docType = docSpec?.docType || 'BIRTH_CERTIFICATE';

        const res = await dependentDocumentApi.uploadDocument(dependentId, docType, fileObj);
        lastRes = res;
        setUploadedKeys((prev) => ({ ...prev, [key]: true }));
      }

      const msg = lastRes?.isProfileComplete
        ? 'Tải lên thành công! Hồ sơ minh chứng người phụ thuộc đã đủ điều kiện giảm trừ gia cảnh.'
        : 'Tải lên thành công! Ảnh minh chứng đã được lưu trữ bảo mật trên hệ thống Tổng cục Thuế.';

      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('Thành công', msg);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Không thể tải lên tệp. Vui lòng thử lại sau.';
      Alert.alert('Lỗi tải lên', errMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header chuẩn Figma: Nền hoa văn quốc huy / trống đồng + Tiêu đề "Ảnh minh chứng" */}
      <View style={styles.royalHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          testID="proofBackBtn"
        >
          <Ionicons name="arrow-back" size={26} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ảnh minh chứng</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Đã ẩn các tab nhóm khác theo yêu cầu - Chỉ hiển thị đúng nhóm người dùng đã chọn */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner thông tin NPT từ Đơn đăng kí nộp thuế */}
        {route.params?.dependentData && (
          <View style={styles.applicantBadge} testID="dependentInfoBanner">
            <Ionicons name="person-circle" size={22} color={theme.colors.primary} />
            <Text style={styles.applicantText} numberOfLines={1}>
              Hồ sơ: <Text style={{ fontWeight: '700' }}>{route.params.dependentData.fullName}</Text>{' '}
              {route.params.dependentData.citizenId
                ? `(CCCD: ${route.params.dependentData.citizenId})`
                : route.params.dependentData.birthCertNumber
                ? `(Số GKS: ${route.params.dependentData.birthCertNumber})`
                : ''}
            </Text>
          </View>
        )}

        {/* Tiêu đề nhóm theo đúng Figma (iPhone 17 - 15) */}
        <View style={styles.titleSection}>
          <Text style={styles.groupTitleText}>{currentGroupSpec.title}</Text>
          <Text style={styles.groupSubtitleText}>{currentGroupSpec.subtitle}</Text>
        </View>

        {/* Danh sách các khung tải lên tương ứng từng loại giấy tờ a, b, c, d */}
        {activeDocs.map((docItem) => {
          const selectedFile = selectedFiles[docItem.key];
          const isUploaded = uploadedKeys[docItem.key];

          return (
            <View key={docItem.key} style={styles.docFieldBlock}>
              {/* Tiêu đề mục: kèm dấu chấm than (!) nếu có quy định luật chi tiết */}
              <View style={styles.docLabelRow}>
                <Text style={styles.docFieldLabel}>{docItem.title}</Text>
                {docItem.lawExplanation && (
                  <TouchableOpacity
                    style={styles.exclamationIconBtn}
                    onPress={() => handleOpenLawModal(docItem.title, docItem.lawExplanation!)}
                    accessibilityRole="button"
                    accessibilityLabel={`Xem quy định cho ${docItem.title}`}
                    testID={`btnLawExclamation_${docItem.key}`}
                  >
                    <Ionicons name="alert-circle-outline" size={20} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Khung upload chữ nhật bo góc lớn theo đúng Figma */}
              <TouchableOpacity
                style={[
                  styles.uploadBox,
                  selectedFile && styles.uploadBoxSelected,
                  isUploaded && styles.uploadBoxUploaded,
                ]}
                activeOpacity={0.75}
                onPress={() => handleOpenDocPicker(docItem.key, docItem.title, docItem.docType)}
                testID={`docUploadBox_${docItem.key}`}
              >
                {selectedFile ? (
                  <View style={styles.selectedFileContent}>
                    {selectedFile.uri && selectedFile.type.includes('image') ? (
                      <Image
                        source={{ uri: selectedFile.uri }}
                        style={styles.thumbnailPreview}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.fileIconBadge}>
                        <Ionicons
                          name={isUploaded ? 'checkmark-circle' : 'document-text'}
                          size={32}
                          color={isUploaded ? theme.colors.success : theme.colors.primary}
                        />
                      </View>
                    )}
                    <Text style={styles.selectedFileName} numberOfLines={1}>
                      {selectedFile.name}
                    </Text>
                    <Text style={styles.selectedFileSize}>
                      {isUploaded ? '✓ Đã tải lên máy chủ' : `Kích thước: ${selectedFile.sizeText}`}
                    </Text>
                    <Text style={styles.repickText}>Bấm vào đây để đổi hoặc chụp lại ảnh</Text>
                  </View>
                ) : (
                  <View style={styles.emptyUploadContent}>
                    <View style={styles.uploadIconContainer}>
                      <Ionicons name="arrow-up" size={32} color="#8B1E1E" style={{ marginBottom: -4 }} />
                      <View style={styles.uploadTrayLine} />
                    </View>
                    <Text style={styles.emptyUploadHint}>Bấm để chụp hoặc tải ảnh minh chứng</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Khoảng cách trước thanh nút bấm */}
        <View style={{ height: 20 }} />

        {/* Nút Lưu thông tin & Hoàn tất (Bỏ quét thông minh do chưa có AI) */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.saveInfoBtn}
            onPress={handleSaveAndContinue}
            activeOpacity={0.8}
            disabled={uploading}
            testID="saveAndContinueBtn"
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.saveInfoBtnText}>Lưu thông tin hồ sơ</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modal Bottom Sheet chọn nguồn ảnh thật từ máy */}
      <Modal
        visible={pickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPickerModalVisible(false)}
        >
          <View style={styles.sheetContent}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Chọn nguồn ảnh minh chứng</Text>
            <Text style={styles.sheetSubtitle} numberOfLines={1}>
              {activePickingDoc?.title}
            </Text>

            <TouchableOpacity style={styles.sheetOption} onPress={handleLaunchCamera}>
              <View style={[styles.sheetIconBox, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="camera" size={22} color="#2E7D32" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>Chụp ảnh từ Camera</Text>
                <Text style={styles.sheetOptionDesc}>Mở camera chụp trực tiếp giấy tờ</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetOption} onPress={handleLaunchGallery}>
              <View style={[styles.sheetIconBox, { backgroundColor: '#E3F2FD' }]}>
                <Ionicons name="images" size={22} color="#1565C0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>Chọn từ Thư viện ảnh</Text>
                <Text style={styles.sheetOptionDesc}>Chọn ảnh chụp có sẵn trong máy</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetOption} onPress={handleLaunchDocument}>
              <View style={[styles.sheetIconBox, { backgroundColor: '#FFF3E0' }]}>
                <Ionicons name="document-text" size={22} color="#E65100" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionTitle}>Chọn tệp tài liệu (PDF)</Text>
                <Text style={styles.sheetOptionDesc}>Tải lên tệp PDF hoặc bản scan</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#8E8E93" />
            </TouchableOpacity>



            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setPickerModalVisible(false)}
            >
              <Text style={styles.sheetCancelText}>Hủy bỏ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal hiển thị quy định chi tiết của luật (chuẩn Frame 262, 263, 264) */}
      <Modal
        visible={lawModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLawModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.lawModalOverlay}
          activeOpacity={1}
          onPress={() => setLawModalVisible(false)}
        >
          <View style={styles.lawModalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.lawModalHeader}>
              <View style={styles.lawModalIconCircle}>
                <Ionicons name="alert-circle" size={24} color="#007AFF" />
              </View>
              <Text style={styles.lawModalTitle} numberOfLines={2}>
                {lawModalData?.title || 'Quy định pháp luật'}
              </Text>
              <TouchableOpacity
                onPress={() => setLawModalVisible(false)}
                style={styles.lawModalCloseBtn}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
              >
                <Ionicons name="close" size={22} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={styles.lawModalDivider} />

            <ScrollView style={styles.lawModalBody} showsVerticalScrollIndicator={false}>
              {lawModalData?.content.split('\n').map((line, idx) => (
                <View key={idx} style={styles.lawBulletRow}>
                  <Text style={styles.lawBulletText}>{line.trim()}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.lawModalConfirmBtn}
              onPress={() => setLawModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.lawModalConfirmBtnText}>Đã hiểu</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  royalHeader: {
    height: 64,
    backgroundColor: '#EBE4D5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  groupTabContainer: {
    backgroundColor: '#FAF8F5',
    borderBottomWidth: 1,
    borderBottomColor: '#ECE7DD',
    paddingVertical: 10,
  },
  groupTabScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  groupTabChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#EFECE6',
  },
  groupTabChipActive: {
    backgroundColor: theme.colors.primary,
  },
  groupTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555555',
  },
  groupTabTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  titleSection: {
    marginBottom: 20,
  },
  groupTitleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  groupSubtitleText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#E53935',
  },
  docFieldBlock: {
    marginBottom: 20,
  },
  docLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  docFieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#262626',
    lineHeight: 20,
    flex: 1,
  },
  exclamationIconBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBox: {
    height: 150,
    backgroundColor: '#F7F7F8',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#D4D4D8',
    borderStyle: 'solid',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadBoxSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FDF7F7',
  },
  uploadBoxUploaded: {
    borderColor: theme.colors.success,
    backgroundColor: '#F0F9F4',
  },
  emptyUploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadTrayLine: {
    width: 26,
    height: 3,
    backgroundColor: '#8B1E1E',
    borderRadius: 2,
    marginTop: 2,
  },
  emptyUploadHint: {
    fontSize: 12,
    color: '#8E8E93',
  },
  selectedFileContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  thumbnailPreview: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginBottom: 6,
  },
  fileIconBadge: {
    marginBottom: 6,
  },
  selectedFileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 2,
  },
  selectedFileSize: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 6,
  },
  repickText: {
    fontSize: 11,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  actionRow: {
    marginTop: 12,
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveInfoBtn: {
    height: 48,
    paddingHorizontal: 28,
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minWidth: 220,
    ...theme.shadows.button,
  },
  saveInfoBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Styles Modal đọc chi tiết quy định luật (chuẩn Frame 262, 263, 264)
  lawModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  lawModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#F5F5F7',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  lawModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lawModalIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lawModalTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  lawModalCloseBtn: {
    padding: 4,
  },
  lawModalDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  lawModalBody: {
    maxHeight: 260,
    marginBottom: 16,
  },
  lawBulletRow: {
    marginBottom: 8,
  },
  lawBulletText: {
    fontSize: 13,
    color: '#2C3E50',
    lineHeight: 19,
  },
  lawModalConfirmBtn: {
    height: 42,
    backgroundColor: '#8B1E1E',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lawModalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Modal Bottom Sheet chọn nguồn ảnh
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D1D6',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  sheetIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  sheetOptionDesc: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  sheetCancelBtn: {
    marginTop: 16,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
  },
  applicantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBF5EE',
    borderWidth: 1,
    borderColor: '#E7DCB9',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  applicantText: {
    fontSize: 13,
    color: '#333333',
    flex: 1,
  },
});
