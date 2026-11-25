import { describe, it, expect } from 'vitest'
import {
  formatAlternativeGroupLabel,
  formatVietnameseDependentGroup,
  formatVietnameseDocType,
  formatVietnameseRelationship,
  formatVietnameseRuleStatus,
} from './dependentRuleLabels'

describe('dependentRuleLabels', () => {
  it('map các mã alternativeGroup phổ biến và mã mới của AI sang tiếng Việt', () => {
    expect(formatAlternativeGroupLabel('RELATION_PROOF')).toBe('Chứng minh quan hệ nhân thân')
    expect(formatAlternativeGroupLabel('IDENTITY_PROOF')).toBe('Giấy tờ tùy thân / Định danh')
    expect(formatAlternativeGroupLabel('RETIREMENT_PROOF')).toBe('Chứng minh hết độ tuổi lao động')
    expect(formatAlternativeGroupLabel('MILITARY_PROOF')).toBe('Chứng minh nghĩa vụ quân sự')
  })

  it('map mã docType chuẩn và mã tùy biến sang tiếng Việt', () => {
    expect(formatVietnameseDocType('CITIZEN_ID')).toBe('Căn cước công dân / CMND')
    expect(formatVietnameseDocType('RELATIONSHIP_CERTIFICATE')).toBe('Giấy tờ xác nhận mối quan hệ gia đình')
    expect(formatVietnameseDocType('OTHER')).toBe('Giấy tờ chứng minh hợp lệ khác')
    expect(formatVietnameseDocType('PENSION_BOOK')).toBe('Sổ hưu trí / Quyết định nghỉ hưu')
  })

  it('map mã nhóm đối tượng và mối quan hệ sang tiếng Việt khi danh mục DB chưa có', () => {
    expect(formatVietnameseDependentGroup('PARENT_RETIRED', [])).toBe('Cha / Mẹ ngoài độ tuổi lao động')
    expect(formatVietnameseDependentGroup('CHILD_UNDER_18', [])).toBe('Con dưới 18 tuổi')
    expect(formatVietnameseRelationship('PARENT', [])).toBe('Cha mẹ (cha mẹ đẻ, cha mẹ vợ/chồng, cha mẹ nuôi)')
    expect(formatVietnameseRuleStatus('Draft')).toBe('Bản nháp (Chờ phê duyệt)')
  })
})
