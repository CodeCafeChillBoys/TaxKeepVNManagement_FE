import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Hook trả về giá trị debounced sau một khoảng thời gian chờ (delay)
 * Phù hợp cho các thanh tìm kiếm (search bar) và các bộ lọc (filter input)
 * @param {*} value - Giá trị cần debounce
 * @param {number} delay - Thời gian chờ tính theo mili-giây (mặc định: 350ms)
 * @returns {*} Giá trị đã được debounce
 */
export function useDebounce(value, delay = 350) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook tạo một hàm callback với cơ chế debounce
 * Phù hợp để trì hoãn các hàm gọi API hoặc các tác vụ nặng
 * @param {Function} callback - Hàm thực thi cần debounce
 * @param {number} delay - Thời gian chờ tính theo mili-giây (mặc định: 350ms)
 * @returns {Function} Hàm debounced
 */
export function useDebouncedCallback(callback, delay = 350) {
  const callbackRef = useRef(callback)
  const timerRef = useRef(null)

  // Luôn cập nhật callback mới nhất
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const debouncedFn = useCallback(
    (...args) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(() => {
        if (callbackRef.current) {
          callbackRef.current(...args)
        }
      }, delay)
    },
    [delay]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  return debouncedFn
}

export default useDebounce
