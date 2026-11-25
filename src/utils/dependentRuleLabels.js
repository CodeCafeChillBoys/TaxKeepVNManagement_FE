import { catalogName, findByCode, isPendingGroup, PENDING_SUFFIX } from './dependentCatalogUtils'

export const ALTERNATIVE_GROUP_VI_LABELS = {
  IDENTITY_PROOF: 'Giấy tờ tùy thân / Định danh',
  ID_PROOF: 'Giấy tờ định danh cá nhân',
  PERSONAL_ID: 'Giấy tờ tùy thân',
  RELATION_PROOF: 'Chứng minh quan hệ nhân thân',
  RELATIONSHIP_PROOF: 'Chứng minh quan hệ nhân thân',
  FAMILY_PROOF: 'Chứng minh quan hệ gia đình',
  BLOOD_RELATION_PROOF: 'Chứng minh quan hệ huyết thống',
  RESIDENCE_PROOF: 'Xác nhận thông tin cư trú',
  STUDY_PROOF: 'Xác nhận đang theo học',
  EDUCATION_PROOF: 'Xác nhận học tập',
  STUDENT_PROOF: 'Xác nhận học sinh / sinh viên',
  DISABILITY_PROOF: 'Xác nhận khuyết tật / Mất khả năng lao động',
  MEDICAL_PROOF: 'Xác nhận y tế / Khuyết tật',
  INCAPACITY_PROOF: 'Xác nhận mất khả năng lao động',
  RETIREMENT_PROOF: 'Chứng minh hết độ tuổi lao động',
  AGE_PROOF: 'Chứng minh độ tuổi',
  LABOR_PROOF: 'Chứng minh tình trạng lao động',
  ELDERLY_PROOF: 'Chứng minh ngoài độ tuổi lao động',
  INCOME_PROOF: 'Xác nhận điều kiện thu nhập',
  SUPPORT_PROOF: 'Xác nhận nghĩa vụ trực tiếp nuôi dưỡng',
  NURTURE_PROOF: 'Xác nhận trực tiếp nuôi dưỡng',
  GUARDIAN_PROOF: 'Xác nhận giám hộ / nuôi dưỡng hợp pháp',
  COMMITMENT_PROOF: 'Cam kết nghĩa vụ nuôi dưỡng',
  MARRIAGE_PROOF: 'Chứng minh quan hệ hôn nhân',
  ADOPTION_PROOF: 'Chứng minh quan hệ nuôi con nuôi',
  CONDITION_PROOF: 'Chứng minh điều kiện giảm trừ',
}

export const DOC_TYPE_VI_LABELS = {
  BIRTH_CERTIFICATE: 'Giấy khai sinh',
  BIRTH_CERT: 'Giấy khai sinh',
  CITIZEN_ID: 'Căn cước công dân / CMND',
  CITIZEN_CARD: 'Căn cước công dân / CMND',
  CCCD: 'Căn cước công dân / CMND',
  CMND: 'Chứng minh nhân dân / CCCD',
  ID_CARD: 'Căn cước công dân / CMND',
  PASSPORT: 'Hộ chiếu',
  VNEID: 'Tài khoản định danh điện tử (VNeID)',
  STUDENT_CARD: 'Thẻ sinh viên / Giấy xác nhận của nhà trường',
  STUDENT_CERT: 'Giấy xác nhận học sinh / sinh viên',
  STUDENT_DOCUMENT: 'Giấy tờ xác nhận đang theo học',
  DISABILITY_CERTIFICATE: 'Giấy xác nhận khuyết tật / Giám định y khoa',
  DISABILITY_CERT: 'Giấy xác nhận khuyết tật / Giám định y khoa',
  MEDICAL_RECORD: 'Hồ sơ bệnh án / Xác nhận cơ quan y tế',
  MEDICAL_CERTIFICATE: 'Giấy xác nhận của cơ quan y tế',
  MARRIAGE_CERTIFICATE: 'Giấy chứng nhận đăng ký kết hôn',
  MARRIAGE_CERT: 'Giấy chứng nhận đăng ký kết hôn',
  RELATIONSHIP_CERTIFICATE: 'Giấy tờ xác nhận mối quan hệ gia đình',
  RELATIONSHIP_CERT: 'Giấy tờ xác nhận mối quan hệ gia đình',
  ADOPTION_DECISION: 'Quyết định công nhận việc nuôi con nuôi',
  ADOPTION_CERTIFICATE: 'Giấy chứng nhận nuôi con nuôi',
  SUPPORT_COMMITMENT_FORM: 'Bản kê khai / Cam kết nuôi dưỡng (Mẫu 09/XN-NPT-TNCN)',
  COMMITMENT_FORM: 'Bản cam kết nuôi dưỡng có xác nhận của UBND cấp xã',
  FORM_09_XN_NPT: 'Bản kê khai người trực tiếp nuôi dưỡng (Mẫu 09/XN-NPT-TNCN)',
  RESIDENCE_CT07: 'Giấy xác nhận thông tin về cư trú (Mẫu CT07)',
  RESIDENCE_CERTIFICATE: 'Giấy xác nhận thông tin về cư trú (Mẫu CT07)',
  HOUSEHOLD_BOOK: 'Sổ hộ khẩu / Giấy xác nhận cư trú',
  INCOME_DECLARATION: 'Tờ khai / Xác nhận thu nhập không vượt mức quy định',
  INCOME_CERT: 'Giấy xác nhận thu nhập',
  LEGAL_GUARDIAN_DOC: 'Giấy tờ xác nhận nghĩa vụ giám hộ / nuôi dưỡng hợp pháp',
  PENSION_BOOK: 'Sổ hưu trí / Quyết định nghỉ hưu',
  RETIREMENT_DECISION: 'Quyết định nghỉ hưu / Hưởng chế độ hưu trí',
  RETIREMENT_CERTIFICATE: 'Giấy tờ xác nhận hết độ tuổi lao động',
  SOCIAL_INSURANCE_BOOK: 'Sổ bảo hiểm xã hội',
  SOCIAL_ASSISTANCE_BOOK: 'Sổ hưởng trợ cấp xã hội',
  MILITARY_SERVICE_CERTIFICATE: 'Giấy chứng nhận thực hiện nghĩa vụ quân sự',
  OTHER: 'Giấy tờ chứng minh hợp lệ khác',
}

export const DEPENDENT_GROUP_VI_FALLBACKS = {
  CHILD_UNDER_18: 'Con dưới 18 tuổi',
  CHILD_OVER_18_STUDYING: 'Con từ 18 tuổi trở lên đang theo học',
  CHILD_STUDYING: 'Con từ 18 tuổi trở lên đang theo học',
  CHILD_OVER_18_DISABLED: 'Con từ 18 tuổi trở lên bị khuyết tật / Mất khả năng lao động',
  CHILD_DISABLED: 'Con bị khuyết tật / Mất khả năng lao động',
  DISABLED_DEPENDENT: 'Người phụ thuộc khuyết tật / Mất khả năng lao động',
  ADULT_CHILD: 'Con thành niên (từ 18 tuổi trở lên)',
  CHILD: 'Con (con đẻ, con nuôi, con riêng)',
  SPOUSE_RETIRED: 'Vợ / Chồng ngoài độ tuổi lao động',
  SPOUSE_DISABLED: 'Vợ / Chồng bị khuyết tật, mất khả năng lao động',
  SPOUSE_OR_PARENTS: 'Vợ / Chồng hoặc Cha / Mẹ',
  SPOUSE: 'Vợ hoặc Chồng',
  PARENT_RETIRED: 'Cha / Mẹ ngoài độ tuổi lao động',
  PARENT_DISABLED: 'Cha / Mẹ bị khuyết tật, mất khả năng lao động',
  PARENT_IN_LAW: 'Cha / Mẹ vợ hoặc Cha / Mẹ chồng',
  PARENT: 'Cha mẹ (cha mẹ đẻ, cha mẹ vợ/chồng, cha mẹ nuôi)',
  OTHER_HELPLESS: 'Cá nhân khác không nơi nương tựa trực tiếp nuôi dưỡng',
  OTHER_DEPENDENT: 'Cá nhân khác không nơi nương tựa trực tiếp nuôi dưỡng',
  OTHER: 'Đối tượng người phụ thuộc khác',
  LEGAL_GUARDIAN: 'Người được giám hộ hợp pháp',
  MARTYR_RELATIVE: 'Thân nhân liệt sĩ / Người có công',
  CHILD_MILITARY_SERVICE: 'Con đang thực hiện nghĩa vụ quân sự',
}

export const RELATIONSHIP_VI_FALLBACKS = {
  CHILD: 'Con (con đẻ, con nuôi, con riêng)',
  SPOUSE: 'Vợ hoặc Chồng',
  PARENT: 'Cha mẹ (cha mẹ đẻ, cha mẹ vợ/chồng, cha mẹ nuôi)',
  OTHER_DEPENDENT: 'Cá nhân khác không nơi nương tựa',
  OTHER: 'Cá nhân khác không nơi nương tựa',
}

export const RULE_STATUS_VI_LABELS = {
  DRAFT: 'Bản nháp (Chờ phê duyệt)',
  ACTIVE: 'Đang áp dụng',
  EXPIRED: 'Hết hiệu lực',
  ARCHIVED: 'Đã lưu trữ',
  INACTIVE: 'Ngừng áp dụng',
}

const TOKEN_VI_DICT = {
  PROOF: 'chứng minh',
  DOC: 'giấy tờ',
  DOCUMENT: 'giấy tờ',
  CERTIFICATE: 'giấy xác nhận',
  CERT: 'giấy xác nhận',
  CARD: 'thẻ',
  BOOK: 'sổ',
  FORM: 'biểu mẫu',
  DECISION: 'quyết định',
  IDENTITY: 'nhân thân',
  PERSONAL: 'cá nhân',
  CITIZEN: 'căn cước công dân',
  ID: 'định danh',
  BIRTH: 'khai sinh',
  MARRIAGE: 'kết hôn',
  RELATION: 'quan hệ nhân thân',
  RELATIONSHIP: 'quan hệ gia đình',
  FAMILY: 'gia đình',
  RESIDENCE: 'cư trú',
  HOUSEHOLD: 'hộ khẩu',
  STUDY: 'học tập',
  STUDYING: 'đang theo học',
  STUDENT: 'sinh viên',
  EDUCATION: 'giáo dục',
  DISABILITY: 'khuyết tật',
  DISABLED: 'khuyết tật',
  MEDICAL: 'y tế',
  HEALTH: 'sức khỏe',
  RETIREMENT: 'hưu trí',
  RETIRED: 'ngoài độ tuổi lao động',
  PENSION: 'hưu trí',
  LABOR: 'lao động',
  AGE: 'độ tuổi',
  INCOME: 'thu nhập',
  SUPPORT: 'nuôi dưỡng',
  COMMITMENT: 'cam kết',
  GUARDIAN: 'giám hộ',
  ADOPTION: 'nuôi con nuôi',
  CHILD: 'con',
  PARENT: 'cha mẹ',
  SPOUSE: 'vợ chồng',
  OTHER: 'khác',
  HELPLESS: 'không nơi nương tựa',
  GROUP: 'nhóm',
  ALTERNATIVE: 'thay thế',
  CONDITION: 'điều kiện',
  SOCIAL: 'xã hội',
  ASSISTANCE: 'trợ cấp',
  MILITARY: 'nghĩa vụ quân sự',
  SERVICE: 'phục vụ',
}

function translateSnakeCaseFallback(rawCode, prefixIfProof = '') {
  const cleaned = String(rawCode || '').trim()
  if (!cleaned) return ''
  // Nếu chuỗi đã có dấu tiếng Việt thì giữ nguyên
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(cleaned)) {
    return cleaned
  }
  const tokens = cleaned.toUpperCase().split(/[_\s-]+/).filter(Boolean)
  if (tokens.length === 0) return cleaned

  const hasProofSuffix = tokens[tokens.length - 1] === 'PROOF' && tokens.length > 1
  const coreTokens = hasProofSuffix ? tokens.slice(0, -1) : tokens

  const translated = coreTokens.map((t) => {
    if (TOKEN_VI_DICT[t]) return TOKEN_VI_DICT[t]
    if (/^\d+$/.test(t)) return t
    return t.toLowerCase()
  })

  let phrase = translated.join(' ').trim()
  if (hasProofSuffix && prefixIfProof) {
    phrase = `${prefixIfProof} ${phrase}`.trim()
  }
  if (!phrase) return cleaned
  return phrase.charAt(0).toUpperCase() + phrase.slice(1)
}

/**
 * Chuyển mã nhóm giấy tờ thay thế (alternativeGroup, VD: RELATION_PROOF) sang tiếng Việt dễ hiểu.
 */
export function formatAlternativeGroupLabel(rawGroup) {
  if (!rawGroup) return ''
  const key = String(rawGroup).trim().toUpperCase()
  if (!key) return ''
  if (ALTERNATIVE_GROUP_VI_LABELS[key]) {
    return ALTERNATIVE_GROUP_VI_LABELS[key]
  }
  return translateSnakeCaseFallback(key, 'Chứng minh')
}

/**
 * Chuyển mã loại chứng từ (docType, VD: RELATIONSHIP_CERTIFICATE, OTHER) sang tiếng Việt.
 */
export function formatVietnameseDocType(docType, customName = '') {
  if (customName && String(customName).trim()) {
    return String(customName).trim()
  }
  if (!docType) return 'Giấy tờ chứng minh'
  const key = String(docType).trim().toUpperCase()
  if (DOC_TYPE_VI_LABELS[key]) {
    return DOC_TYPE_VI_LABELS[key]
  }
  return translateSnakeCaseFallback(key, 'Giấy tờ')
}

/**
 * Chuyển mã nhóm đối tượng người phụ thuộc sang tiếng Việt (ưu tiên tên trong danh mục DB).
 */
export function formatVietnameseDependentGroup(code, groups = []) {
  if (!code) return 'Người phụ thuộc'
  const found = findByCode(groups, code)
  if (found && found.name) {
    return `${catalogName(groups, code)}${isPendingGroup(found) ? PENDING_SUFFIX : ''}`
  }
  const key = String(code).trim().toUpperCase()
  if (DEPENDENT_GROUP_VI_FALLBACKS[key]) {
    return `${DEPENDENT_GROUP_VI_FALLBACKS[key]}${found && isPendingGroup(found) ? PENDING_SUFFIX : ''}`
  }
  return translateSnakeCaseFallback(key)
}

/**
 * Chuyển mã quan hệ (CHILD, SPOUSE, PARENT, OTHER_DEPENDENT) sang tiếng Việt (ưu tiên danh mục DB).
 */
export function formatVietnameseRelationship(code, relationships = []) {
  if (!code) return 'Chưa xác định'
  const found = findByCode(relationships, code)
  if (found && found.name) {
    return found.name
  }
  const key = String(code).trim().toUpperCase()
  if (RELATIONSHIP_VI_FALLBACKS[key]) {
    return RELATIONSHIP_VI_FALLBACKS[key]
  }
  return translateSnakeCaseFallback(key)
}

/**
 * Chuyển trạng thái quy tắc sang tiếng Việt (không phân biệt hoa thường).
 */
export function formatVietnameseRuleStatus(status) {
  if (!status) return RULE_STATUS_VI_LABELS.DRAFT
  const key = String(status).trim().toUpperCase()
  return RULE_STATUS_VI_LABELS[key] || translateSnakeCaseFallback(status)
}
