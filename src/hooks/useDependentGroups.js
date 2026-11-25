import { useState, useEffect, useCallback } from 'react'
import { dependentCatalogService } from '@/services/dependentCatalogService'

/**
 * Danh sách nhóm NPT (gồm cả nhóm AI chờ duyệt) cho các màn Admin.
 * Lỗi thì trả `error` để màn hình báo và cho thử lại, không có danh sách dự phòng.
 */
export function useDependentGroups() {
  const [groups, setGroups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let alive = true
    dependentCatalogService
      .listGroups()
      .then((list) => {
        if (!alive) return
        setGroups(Array.isArray(list) ? list : [])
        setError('')
      })
      .catch((err) => {
        if (alive) setError(err?.message || 'Không tải được danh mục nhóm người phụ thuộc.')
      })
      .finally(() => {
        if (alive) setIsLoading(false)
      })
    return () => {
      alive = false
    }
  }, [tick])

  const reload = useCallback(() => {
    setIsLoading(true)
    setTick((t) => t + 1)
  }, [])

  return { groups, isLoading, error, reload }
}
