import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Hook trả về giá trị debounced sau một khoảng thời gian chờ (delay).
 * Phù hợp cho các thanh tìm kiếm (search bar), bộ lọc (filter input) và dependencies khi fetch API.
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
 * Hook quản lý trạng thái loading với kỹ thuật debounce & thời gian hiển thị tối thiểu (minDuration).
 * Giúp chống nháy giao diện (anti-flicker) và tránh lỗi xung đột render khi fetch data liên tục.
 * @param {boolean} isLoading - Trạng thái loading gốc từ quá trình fetch API
 * @param {Object} [options]
 * @param {number} [options.delay=120] - Độ trễ trước khi kích hoạt loading (ms)
 * @param {number} [options.minDuration=280] - Thời gian hiển thị loading tối thiểu để UI mượt mà (ms)
 * @returns {boolean} Trạng thái loading đã được chuẩn hóa qua debounce
 */
export function useDebouncedLoading(isLoading, { delay = 120, minDuration = 280 } = {}) {
  const [showLoading, setShowLoading] = useState(Boolean(isLoading))
  const startTimeRef = useRef(isLoading ? Date.now() : null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (isLoading) {
      if (showLoading) {
        return
      }
      // Nếu mới mount hoặc delay <= 0 thì hiển thị ngay
      if (delay <= 0) {
        startTimeRef.current = Date.now()
        setShowLoading(true)
      } else {
        timerRef.current = setTimeout(() => {
          startTimeRef.current = Date.now()
          setShowLoading(true)
        }, delay)
      }
    } else {
      if (!showLoading) {
        return
      }
      const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : minDuration
      const remaining = Math.max(0, minDuration - elapsed)
      if (remaining <= 0) {
        startTimeRef.current = null
        setShowLoading(false)
      } else {
        timerRef.current = setTimeout(() => {
          startTimeRef.current = null
          setShowLoading(false)
        }, remaining)
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [isLoading, delay, minDuration, showLoading])

  return showLoading
}

/**
 * Hook tạo một hàm callback với cơ chế debounce.
 * Phù hợp để trì hoãn các hàm gọi API hoặc các tác vụ nặng khi người dùng thao tác liên tục.
 * @param {Function} callback - Hàm thực thi cần debounce
 * @param {number} delay - Thời gian chờ tính theo mili-giây (mặc định: 350ms)
 * @returns {Function} Hàm debounced
 */
export function useDebouncedCallback(callback, delay = 350) {
  const callbackRef = useRef(callback)
  const timerRef = useRef(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

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

  debouncedFn.cancel = cancel

  useEffect(() => {
    return cancel
  }, [cancel])

  return debouncedFn
}

export default useDebounce
