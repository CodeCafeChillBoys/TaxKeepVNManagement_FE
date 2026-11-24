import { describe, it, expect } from 'vitest'
import { normalizeAlternativeGroup } from './dependentRuleService'

describe('normalizeAlternativeGroup', () => {
  it('chuẩn hóa mã chữ hoa, khoảng trắng thành _', () => {
    expect(normalizeAlternativeGroup(' relation proof ')).toBe('RELATION_PROOF')
    expect(normalizeAlternativeGroup('IDENTITY_PROOF')).toBe('IDENTITY_PROOF')
  })

  it('rỗng thì trả null', () => {
    expect(normalizeAlternativeGroup('')).toBeNull()
    expect(normalizeAlternativeGroup('   ')).toBeNull()
    expect(normalizeAlternativeGroup(null)).toBeNull()
    expect(normalizeAlternativeGroup(undefined)).toBeNull()
  })
})
