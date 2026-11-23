// Danh sách số trang cần hiện, rút gọn bằng '…' khi quá nhiều trang.
export function getPageNumbers(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
  const wanted = new Set([1, totalPages, page - 1, page, page + 1])
  const nums = [...wanted].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)
  const out = []
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
}
