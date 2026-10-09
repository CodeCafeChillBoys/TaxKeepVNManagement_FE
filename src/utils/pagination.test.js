import { describe, it, expect } from 'vitest'
import { getPageNumbers } from './pagination'

describe('getPageNumbers', () => {
  it('không có trang nào', () => {
    expect(getPageNumbers(1, 0)).toEqual([])
  })
  it('ít trang thì hiện hết', () => {
    expect(getPageNumbers(1, 1)).toEqual([1])
    expect(getPageNumbers(3, 5)).toEqual([1, 2, 3, 4, 5])
    expect(getPageNumbers(1, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })
  it('nhiều trang thì rút gọn bằng dấu …', () => {
    expect(getPageNumbers(1, 10)).toEqual([1, 2, '…', 10])
    expect(getPageNumbers(10, 20)).toEqual([1, '…', 9, 10, 11, '…', 20])
    expect(getPageNumbers(20, 20)).toEqual([1, '…', 19, 20])
    expect(getPageNumbers(3, 10)).toEqual([1, 2, 3, 4, '…', 10])
  })
})
