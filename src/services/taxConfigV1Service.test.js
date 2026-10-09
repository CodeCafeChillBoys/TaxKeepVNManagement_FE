import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./apiClient', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

import { apiClient } from './apiClient'
import { taxConfigV1Service } from './taxConfigV1Service'

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getAll', () => {
  it('gọi đúng đường dẫn và bỏ tham số rỗng', async () => {
    apiClient.get.mockResolvedValue({ success: true, data: { items: [], pagination: {} } })
    await taxConfigV1Service.getAll({ page: 2, size: 10, search: '', sort: undefined, isActive: false })
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/system-configs', {
      params: { page: 2, size: 10, isActive: false },
    })
  })

  it('gửi kèm taxYear khi lọc theo năm tính thuế', async () => {
    apiClient.get.mockResolvedValue({ success: true, data: { items: [], pagination: {} } })
    await taxConfigV1Service.getAll({ page: 1, size: 10, taxYear: 2026 })
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/system-configs', {
      params: { page: 1, size: 10, taxYear: 2026 },
    })
  })

  it('trả về phần data của envelope', async () => {
    const data = { items: [{ configKey: 'A' }], pagination: { totalItems: 1 } }
    apiClient.get.mockResolvedValue({ success: true, data })
    await expect(taxConfigV1Service.getAll()).resolves.toEqual(data)
  })
})

describe('getById', () => {
  it('gọi theo id và trả data', async () => {
    apiClient.get.mockResolvedValue({ success: true, data: { configId: 'abc' } })
    await expect(taxConfigV1Service.getById('abc')).resolves.toEqual({ configId: 'abc' })
    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/system-configs/id/abc')
  })
})

describe('create', () => {
  it('gửi payload đã làm sạch, có appliesFromYear, trả { data, message }', async () => {
    apiClient.post.mockResolvedValue({ success: true, message: 'Tạo mới thành công', data: { configKey: 'K' } })
    const result = await taxConfigV1Service.create({
      configKey: ' K ',
      configValue: '1',
      description: '  ',
      appliesFromYear: 2026,
      isActive: undefined,
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/v1/system-configs', {
      configKey: 'K',
      configValue: '1',
      description: null,
      appliesFromYear: 2026,
      isActive: true,
    })
    expect(result).toEqual({ data: { configKey: 'K' }, message: 'Tạo mới thành công' })
  })

  it('không nhập năm thì gửi appliesFromYear = null (tham số mặc định)', async () => {
    apiClient.post.mockResolvedValue({ success: true, message: 'OK', data: {} })
    await taxConfigV1Service.create({ configKey: 'K', configValue: '1' })
    expect(apiClient.post.mock.calls[0][1].appliesFromYear).toBeNull()
  })
})

describe('updateById', () => {
  it('PUT theo id, description rỗng thành null, luôn gửi appliesFromYear', async () => {
    apiClient.put.mockResolvedValue({ success: true, message: 'OK', data: { configKey: 'K' } })
    const result = await taxConfigV1Service.updateById('abc', {
      configValue: '2',
      description: '',
      appliesFromYear: 2026,
      isActive: false,
    })
    expect(apiClient.put).toHaveBeenCalledWith('/api/v1/system-configs/id/abc', {
      configValue: '2',
      description: null,
      appliesFromYear: 2026,
      isActive: false,
    })
    expect(result).toEqual({ data: { configKey: 'K' }, message: 'OK' })
  })

  it('appliesFromYear thiếu vẫn được gửi là null (backend coi khác năm là đổi năm)', async () => {
    apiClient.put.mockResolvedValue({ success: true, message: 'OK', data: {} })
    await taxConfigV1Service.updateById('abc', { configValue: '2' })
    expect(apiClient.put.mock.calls[0][1]).toEqual({ configValue: '2', description: null, appliesFromYear: null })
  })

  it('để lỗi từ apiClient nổi lên nguyên vẹn', async () => {
    const err = Object.assign(new Error('Dữ liệu đầu vào không hợp lệ.'), { status: 400 })
    apiClient.put.mockRejectedValue(err)
    await expect(taxConfigV1Service.updateById('abc', { configValue: '' })).rejects.toBe(err)
  })
})
