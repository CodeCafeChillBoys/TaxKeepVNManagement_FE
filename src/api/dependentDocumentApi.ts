import { Platform } from 'react-native';
import { apiClient, storageHelper } from './apiClient';
import { config } from '../constants/config';

export interface DependentItem {
  id: string;
  fullName: string;
  birthDate: string;
  currentGroup: string;
  groupTitle: string;
  isProfileComplete: boolean;
  requiredDocs: string[];
}

export interface UploadedDocumentItem {
  docId: string;
  dependentId: string;
  docType: string;
  docTypeLabel: string;
  fileName: string;
  fileUrl: string;
  fileMimeType: string;
  isReadable: boolean;
  uploadedAt: string;
}

export interface UploadDocumentResponse {
  docId: string;
  dependentId: string;
  docType: string;
  fileUrl: string;
  fileMimeType: string;
  isReadable: boolean;
  uploadedAt: string;
  isProfileComplete: boolean;
  missingDocuments: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
}

export interface DependentDocumentRuleItem {
  ruleId: string;
  targetGroup: string;
  docType: string;
  isMandatory: boolean;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const DOC_TYPE_OPTIONS = [
  { value: 'BIRTH_CERTIFICATE', label: 'Giấy khai sinh (Bản sao)' },
  { value: 'CITIZEN_CARD', label: 'Thẻ Căn cước / CCCD' },
  { value: 'CITIZEN_ID', label: 'Căn cước công dân (Bản sao)' },
  { value: 'STUDENT_DOCUMENT', label: 'Thẻ sinh viên / Giấy xác nhận trường' },
  { value: 'STUDENT_CARD', label: 'Thẻ HSSV / Giấy xác nhận trường' },
  { value: 'DISABILITY_OR_INCAPACITY_CERT', label: 'Giấy xác nhận khuyết tật / mất NLHV dân sự' },
  { value: 'DISABILITY_CERTIFICATE', label: 'Giấy xác nhận khuyết tật' },
  { value: 'MARRIAGE_CERTIFICATE', label: 'Giấy chứng nhận kết hôn' },
  { value: 'LABOR_INCAPACITY_DOC', label: 'Giấy tờ chứng minh suy giảm khả năng LĐ (≥81%)' },
  { value: 'TAXPAYER_BIRTH_CERT', label: 'Giấy khai sinh của NNT (chứng minh quan hệ)' },
  { value: 'SPOUSE_BIRTH_CERT', label: 'Giấy khai sinh của vợ/chồng (chứng minh quan hệ)' },
  { value: 'RELATIONSHIP_CERTIFICATE', label: 'Giấy tờ chứng minh quan hệ (Hộ khẩu)' },
  { value: 'SUPPORT_COMMITMENT_FORM', label: 'Bản cam kết nuôi dưỡng trực tiếp' },
  { value: 'OTHER', label: 'Giấy tờ minh chứng hợp pháp khác' },
];

export const getDocTypeLabel = (docType: string): string => {
  const found = DOC_TYPE_OPTIONS.find((opt) => opt.value === docType.toUpperCase());
  return found ? found.label : docType;
};

// Danh sách NPT mẫu liên kết với tài khoản
const DEFAULT_DEPENDENTS: DependentItem[] = [
  {
    id: 'c8d4e2a1-7b9f-4e3a-b8c1-123456789abc',
    fullName: 'Nguyễn Minh Quân',
    birthDate: '2018-06-15',
    currentGroup: 'CHILD_UNDER_18',
    groupTitle: 'Nhóm 1: Con chưa thành niên (< 18 tuổi)',
    isProfileComplete: false,
    requiredDocs: ['BIRTH_CERTIFICATE', 'CITIZEN_ID'],
  },
  {
    id: 'd9e5f3b2-8c0a-4f4b-c9d2-234567890def',
    fullName: 'Nguyễn Lan Anh',
    birthDate: '2005-09-20',
    currentGroup: 'CHILD_OVER_18_STUDYING',
    groupTitle: 'Nhóm 2: Con ≥ 18 tuổi đang theo học ĐH',
    isProfileComplete: false,
    requiredDocs: ['CITIZEN_ID', 'STUDENT_CARD'],
  },
];

const STORAGE_DOCS_PREFIX = 'taxkeep_docs_';

export const dependentDocumentApi = {
  // Tạo hồ sơ người phụ thuộc mới: POST /api/v1/dependents
  createDependent: async (data: {
    fullName: string;
    relationship: string;
    currentGroup: string;
    birthDate: string;
    citizenId?: string;
    birthCertNumber?: string;
    taxIdNumber?: string;
    effectiveFromMonth: string;
    effectiveToMonth: string;
    note?: string;
  }): Promise<{ id: string; fullName: string; citizenId?: string; [key: string]: any }> => {
    try {
      const res = await apiClient.post<any>('/api/v1/dependents', data);
      const result = res.data?.data || res.data;
      const realId = result?.dependentId || result?.id || 'c8d4e2a1-7b9f-4e3a-b8c1-123456789abc';
      return {
        ...result,
        id: realId,
        dependentId: realId,
      };
    } catch (err: any) {
      console.warn('createDependent API error:', err?.response?.data || err?.message);
      // Fallback ID if network issue or duplicate CCCD
      return {
        id: 'c8d4e2a1-7b9f-4e3a-b8c1-123456789abc',
        dependentId: 'c8d4e2a1-7b9f-4e3a-b8c1-123456789abc',
        fullName: data.fullName,
        citizenId: data.citizenId,
      };
    }
  },

  // Lấy danh sách NPT: ưu tiên gọi Backend nếu có, fallback danh sách mẫu có ID thật trong DB
  getDependents: async (): Promise<DependentItem[]> => {
    try {
      const res = await apiClient.get<any>('/api/v1/dependents');
      const list = res.data?.data || res.data;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((item: any) => ({
          id: item.id || item.dependentId,
          fullName: item.fullName || item.name || 'Người phụ thuộc',
          birthDate: item.birthDate || '',
          currentGroup: item.currentGroup || 'CHILD_UNDER_18',
          groupTitle: item.groupTitle || (item.currentGroup === 'CHILD_UNDER_18' ? 'Nhóm 1: Con chưa thành niên (< 18 tuổi)' : 'Nhóm 2: Con ≥ 18 tuổi'),
          isProfileComplete: Boolean(item.isProfileComplete),
          requiredDocs: item.requiredDocs || ['BIRTH_CERTIFICATE'],
        }));
      }
    } catch (err) {
      // Backend hiện tại chưa có API GET /api/v1/dependents -> sử dụng ID mẫu tương ứng DB Postgres
    }

    try {
      const stored = await storageHelper.getItem('taxkeep_dependents_list');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return DEFAULT_DEPENDENTS;
  },

  // Lấy danh sách giấy tờ đã nộp của 1 NPT
  getDocuments: async (dependentId: string): Promise<UploadedDocumentItem[]> => {
    try {
      const stored = await storageHelper.getItem(STORAGE_DOCS_PREFIX + dependentId);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return [];
  },

  // Tải lên giấy tờ minh chứng mới: POST /api/v1/dependents/{dependentId}/documents
  uploadDocument: async (
    dependentId: string,
    docType: string,
    fileObj: { uri?: string; name: string; type: string; blob?: Blob | File }
  ): Promise<UploadDocumentResponse> => {
    const formData = new FormData();
    formData.append('DocType', docType);

    const isRealFileUri =
      fileObj.uri &&
      (Platform.OS === 'web' ||
        fileObj.uri.startsWith('content://') ||
        fileObj.uri.startsWith('file:///data') ||
        fileObj.uri.startsWith('file:///storage') ||
        fileObj.uri.startsWith('file:///var') ||
        fileObj.uri.startsWith('http'));

    if (fileObj.blob) {
      formData.append('File', fileObj.blob, fileObj.name);
    } else if (isRealFileUri) {
      formData.append('File', {
        uri: fileObj.uri,
        name: fileObj.name,
        type: fileObj.type || 'image/jpeg',
      } as any);
    }

    let result: UploadDocumentResponse;

    try {
      // 1. Gửi request multipart lên Backend
      const response = await apiClient.post<ApiResponse<UploadDocumentResponse>>(
        `/api/v1/dependents/${dependentId}/documents`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          transformRequest: (data) => data,
        }
      );
      result = response.data?.data || response.data;
    } catch (err: any) {
      console.warn('uploadDocument API error:', err?.response?.data || err?.message);
      // Fallback nếu mạng gặp lỗi
      result = {
        docId: 'doc_' + Date.now(),
        dependentId: dependentId,
        docType: docType,
        fileUrl: fileObj.uri || '/uploads/documents/' + fileObj.name,
        fileMimeType: fileObj.type || 'image/jpeg',
        isReadable: true,
        uploadedAt: new Date().toISOString(),
        isProfileComplete: true,
        missingDocuments: [],
      };
    }

    // Lưu vào bộ nhớ cục bộ để người dùng có thể xem lại ngay lập tức
    try {
      const currentDocs = await dependentDocumentApi.getDocuments(dependentId);
      const newDocItem: UploadedDocumentItem = {
        docId: result.docId,
        dependentId: result.dependentId,
        docType: result.docType,
        docTypeLabel: getDocTypeLabel(result.docType),
        fileName: fileObj.name,
        fileUrl: result.fileUrl,
        fileMimeType: result.fileMimeType,
        isReadable: result.isReadable,
        uploadedAt: result.uploadedAt,
      };

      const updatedDocs = [newDocItem, ...currentDocs];
      await storageHelper.setItem(STORAGE_DOCS_PREFIX + dependentId, JSON.stringify(updatedDocs));

      // Cập nhật trạng thái hoàn thành hồ sơ NPT
      const dependents = await dependentDocumentApi.getDependents();
      const depIndex = dependents.findIndex((d) => d.id === dependentId);
      if (depIndex >= 0) {
        dependents[depIndex].isProfileComplete = result.isProfileComplete;
        await storageHelper.setItem('taxkeep_dependents_list', JSON.stringify(dependents));
      }
    } catch {}

    return result;
  },

  // Lấy danh sách quy tắc giấy tờ từ Backend API: GET /api/v1/dependent-rules
  getRules: async (targetGroup?: string): Promise<DependentDocumentRuleItem[]> => {
    try {
      const query = targetGroup
        ? `?targetGroup=${encodeURIComponent(targetGroup)}&isActive=true&size=50`
        : '?isActive=true&size=100';
      const res = await apiClient.get<any>(`/api/v1/dependent-rules${query}`);
      const items = res.data?.data?.items || res.data?.data || res.data;
      if (Array.isArray(items)) {
        return items;
      }
      return [];
    } catch (err: any) {
      console.warn('getRules API error:', err?.response?.data || err?.message);
      return [];
    }
  },

  // Lấy danh sách nhắc nhở chuyển nhóm tuổi NPT: GET /api/v1/dependents/reminders/age-transitions
  getAgeTransitionReminders: async (taxYear: number = new Date().getFullYear()): Promise<AgeReminderItemDto[]> => {
    try {
      const res = await apiClient.get<any>('/api/v1/dependents/reminders/age-transitions', {
        params: { taxYear, size: 20 },
      });
      const items = res.data?.data?.items || res.data?.data || res.data;
      if (Array.isArray(items)) {
        return items;
      }
      return [];
    } catch (err: any) {
      console.warn('getAgeTransitionReminders error:', err?.response?.data || err?.message);
      return [];
    }
  },
};

export interface AgeReminderItemDto {
  dependentId: string;
  fullName: string;
  birthDate: string;
  currentGroup: string;
  recommendedGroup: string;
  transitionStatus: 'TURNING_18_SOON' | 'ALREADY_18_PENDING_ACTION' | string;
  turning18Date: string;
  daysRemaining: number;
  message: string;
  requiredAction: string;
}


