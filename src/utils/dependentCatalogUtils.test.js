import { describe, it, expect } from 'vitest'
import {
  isPendingGroup,
  filterPendingGroups,
  countPendingGroups,
  catalogName,
  groupOptionLabel,
  buildGroupOptions,
  buildDependentTypeOptions,
  alternativeGroupSuggestions,
  documentAlternativeSuggestions,
  validateGroupForm,
  validateRelationshipForm,
  formatAgeRange,
  NEW_CODE_LABEL,
} from './dependentCatalogUtils'

const groups = [
  { code: 'PARENT_RETIRED', name: 'Cha mẹ hết tuổi lao động', relationshipCode: 'PARENT', isActive: true, source: 'ADMIN', displayOrder: 5 },
  { code: 'CHILD_UNDER_18', name: 'Con dưới 18 tuổi', relationshipCode: 'CHILD', isActive: true, source: 'ADMIN', displayOrder: 1 },
  { code: 'FOSTER_CHILD', name: 'Con nuôi', relationshipCode: null, isActive: false, source: 'AI', displayOrder: 9 },
  { code: 'OLD_GROUP', name: 'Nhóm cũ đã tắt', relationshipCode: 'OTHER_DEPENDENT', isActive: false, source: 'ADMIN', displayOrder: 8 },
]

describe('nhóm chờ duyệt', () => {
  it('chỉ nhóm source=AI và chưa active', () => {
    expect(isPendingGroup(groups[2])).toBe(true)
    expect(isPendingGroup(groups[3])).toBe(false)
    expect(isPendingGroup({ source: 'ai', isActive: false })).toBe(true)
    expect(isPendingGroup({ source: 'AI', isActive: true })).toBe(false)
    expect(filterPendingGroups(groups).map((g) => g.code)).toEqual(['FOSTER_CHILD'])
    expect(countPendingGroups(groups)).toBe(1)
    expect(countPendingGroups()).toBe(0)
  })
})

describe('nhãn theo catalog', () => {
  it('tra tên theo mã, không phân biệt hoa thường; thiếu thì trả lại mã', () => {
    expect(catalogName(groups, 'child_under_18')).toBe('Con dưới 18 tuổi')
    expect(catalogName(groups, 'NEW_CODE')).toBe('NEW_CODE')
    expect(catalogName(groups, null)).toBe('')
  })

  it('thêm "(chờ duyệt)" cho nhóm AI chưa duyệt', () => {
    expect(groupOptionLabel(groups[2])).toBe('Con nuôi (chờ duyệt)')
    expect(groupOptionLabel(groups[1])).toBe('Con dưới 18 tuổi')
  })

  it('option sắp theo displayOrder, giữ mã ngoài danh mục ở cuối', () => {
    const opts = buildGroupOptions(groups, ['LEGACY', 'child_under_18', ''])
    expect(opts.map((o) => o.value)).toEqual(['CHILD_UNDER_18', 'PARENT_RETIRED', 'OLD_GROUP', 'FOSTER_CHILD', 'LEGACY'])
    expect(opts.find((o) => o.value === 'FOSTER_CHILD').isPending).toBe(true)
    expect(opts.find((o) => o.value === 'LEGACY')).toMatchObject({ isUnknown: true, label: 'LEGACY' })
  })

  it('mã AI đề xuất chưa có trong danh mục được giữ với nhãn "Mã mới – sẽ chờ duyệt"', () => {
    const opts = buildDependentTypeOptions(groups, 'STEP_CHILD')
    expect(opts.at(-1)).toMatchObject({ value: 'STEP_CHILD', label: `STEP_CHILD – ${NEW_CODE_LABEL}` })
    expect(buildDependentTypeOptions(groups, 'PARENT_RETIRED')).toHaveLength(groups.length)
    expect(buildDependentTypeOptions(groups, '')).toHaveLength(groups.length)
  })
})

describe('gợi ý alternativeGroup', () => {
  const rules = [
    { targetGroup: 'PARENT_RETIRED', alternativeGroup: 'RELATION_PROOF' },
    { targetGroup: 'PARENT_RETIRED', alternativeGroup: 'RELATION_PROOF' },
    { targetGroup: 'PARENT_RETIRED', alternativeGroup: null },
    { targetGroup: 'CHILD_UNDER_18', alternativeGroup: 'IDENTITY_PROOF' },
    { targetGroup: 'CHILD_UNDER_18', alternativeGroup: '  ' },
  ]

  it('chỉ lấy giá trị đã dùng trong cùng nhóm, bỏ trùng và rỗng', () => {
    expect(alternativeGroupSuggestions(rules, 'PARENT_RETIRED')).toEqual(['RELATION_PROOF'])
    expect(alternativeGroupSuggestions(rules, 'child_under_18')).toEqual(['IDENTITY_PROOF'])
    expect(alternativeGroupSuggestions(rules, 'SPOUSE_DISABLED')).toEqual([])
  })

  it('không chọn nhóm thì gợi ý mọi giá trị', () => {
    expect(alternativeGroupSuggestions(rules, '')).toEqual(['IDENTITY_PROOF', 'RELATION_PROOF'])
  })

  it('gợi ý trong danh sách giấy tờ AI', () => {
    expect(
      documentAlternativeSuggestions([{ alternativeGroup: 'B' }, { alternativeGroup: 'A' }, { alternativeGroup: 'B' }, {}])
    ).toEqual(['A', 'B'])
  })
})

describe('validateGroupForm', () => {
  const base = { code: 'FOSTER_CHILD', name: 'Con nuôi', relationshipCode: 'CHILD', minAge: '', maxAge: '', level: '0', displayOrder: '1' }

  it('form hợp lệ', () => {
    expect(validateGroupForm(base)).toEqual({})
  })

  it('minAge phải nhỏ hơn maxAge khi có cả hai', () => {
    expect(validateGroupForm({ ...base, minAge: '18', maxAge: '18' }).maxAge).toBeTruthy()
    expect(validateGroupForm({ ...base, minAge: '22', maxAge: '18' }).maxAge).toBeTruthy()
    expect(validateGroupForm({ ...base, minAge: '18', maxAge: '22' })).toEqual({})
    expect(validateGroupForm({ ...base, minAge: '18' })).toEqual({})
  })

  it('tuổi/level phải là số nguyên không âm', () => {
    expect(validateGroupForm({ ...base, minAge: '-1' }).minAge).toBeTruthy()
    expect(validateGroupForm({ ...base, level: 'abc' }).level).toBeTruthy()
  })

  it('bắt buộc mã khi tạo, mã chỉ A-Z 0-9 _', () => {
    expect(validateGroupForm({ ...base, code: '' }).code).toBeTruthy()
    expect(validateGroupForm({ ...base, code: 'con-nuoi' }).code).toBeTruthy()
    expect(validateGroupForm({ ...base, code: '' }, 'edit').code).toBeUndefined()
  })

  it('nhóm active hoặc duyệt nhóm thì bắt buộc quan hệ', () => {
    expect(validateGroupForm({ ...base, relationshipCode: '' }).relationshipCode).toBeTruthy()
    expect(validateGroupForm({ ...base, relationshipCode: '', isActive: false }).relationshipCode).toBeUndefined()
    expect(validateGroupForm({ ...base, relationshipCode: '', isActive: false }, 'activate').relationshipCode).toBeTruthy()
  })
})

describe('validateRelationshipForm', () => {
  it('bắt buộc mã và tên', () => {
    expect(validateRelationshipForm({ code: 'FOSTER', name: 'Con nuôi' })).toEqual({})
    expect(validateRelationshipForm({ code: '', name: '' })).toMatchObject({ code: expect.any(String), name: expect.any(String) })
    expect(validateRelationshipForm({ name: 'X', displayOrder: '1.5' }, 'edit').displayOrder).toBeTruthy()
  })
})

describe('formatAgeRange', () => {
  it('hiển thị khoảng tuổi', () => {
    expect(formatAgeRange(18, 22)).toBe('18–22')
    expect(formatAgeRange(60, null)).toBe('≥ 60')
    expect(formatAgeRange(null, 18)).toBe('< 18')
    expect(formatAgeRange(null, null)).toBe('—')
    expect(formatAgeRange(0, 18)).toBe('0–18')
  })
})
