import { useState, useEffect } from 'react'
import { expertSearchConfigService } from '@/services/expertSearchConfigService'
import { expertService } from '@/services/expertService'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ConfirmDialog, NotificationDialog } from '@/components/ui/notification-dialog'
import { SectionLoading } from '@/components/ui/loading'

// Khớp 100% enum ExpertSortBy và nhãn trong ExpertController.GetSortOptions (BE)
const SORT_OPTIONS = [
  { value: 'Recommended', code: 0, label: 'Đề xuất ưu tiên' },
  { value: 'RatingDesc', code: 1, label: 'Đánh giá sao cao nhất' },
  { value: 'CompletedSessionsDesc', code: 5, label: 'Nhiều ca tư vấn hoàn thành nhất' },
  { value: 'FeeAsc', code: 2, label: 'Mức phí thấp nhất' },
  { value: 'FeeDesc', code: 3, label: 'Mức phí cao nhất' },
  { value: 'ExperienceDesc', code: 4, label: 'Nhiều năm kinh nghiệm nhất' },
]

const SORT_BY_CODE_MAP = SORT_OPTIONS.reduce((acc, opt) => {
  acc[opt.code] = opt.value
  return acc
}, {})

const SORT_BY_LOWER_MAP = {
  recommended: 'Recommended',
  ratingdesc: 'RatingDesc',
  feeasc: 'FeeAsc',
  feedesc: 'FeeDesc',
  experiencedesc: 'ExperienceDesc',
  completedsessionsdesc: 'CompletedSessionsDesc',
  sessionsdesc: 'CompletedSessionsDesc',
}

// Khớp 100% SearchableFieldsConfig trên BE
const SEARCHABLE_FIELD_OPTIONS = [
  { key: 'searchInFullName', label: 'Họ và tên chuyên gia', desc: 'Tìm theo tên hiển thị' },
  { key: 'searchInJobTitle', label: 'Chức danh nghề nghiệp', desc: 'Ví dụ: Kế toán trưởng, Đại lý thuế' },
  { key: 'searchInCompanyName', label: 'Đơn vị công tác', desc: 'Tên công ty hoặc tổ chức hành nghề' },
  { key: 'searchInSpecializations', label: 'Lĩnh vực tư vấn', desc: 'Tìm theo tên chuyên ngành thuế' },
  { key: 'searchInBio', label: 'Giới thiệu & Kinh nghiệm', desc: 'Tìm từ khóa trong tóm tắt chuyên môn' },
  { key: 'searchInCertificates', label: 'Tên chứng chỉ hành nghề', desc: 'Tìm theo văn bằng, chứng chỉ đã xác thực' },
]

// Khớp 100% RankingWeightsConfig (5 trọng số, thang 0..1 trên BE <-> 0..100% trên UI)
const WEIGHT_FIELDS = [
  {
    key: 'ratingWeight',
    label: 'Điểm đánh giá trung bình',
    desc: 'Mức độ hài lòng từ khách hàng (thang 5 sao)',
    defaultPercent: 35,
  },
  {
    key: 'completedConsultationsWeight',
    label: 'Số ca tư vấn hoàn thành',
    desc: 'Kinh nghiệm giải quyết hồ sơ thực tế trên hệ thống',
    defaultPercent: 25,
  },
  {
    key: 'reviewsCountWeight',
    label: 'Số lượt nhận xét',
    desc: 'Độ phủ phản hồi từ người nộp thuế',
    defaultPercent: 15,
  },
  {
    key: 'slotAvailabilityWeight',
    label: 'Lịch rảnh sắp tới',
    desc: 'Ưu tiên chuyên gia có khung giờ trống trong 3 ngày tới',
    defaultPercent: 15,
  },
  {
    key: 'verifiedCertificateWeight',
    label: 'Chứng chỉ đã xác thực',
    desc: 'Ưu tiên hồ sơ có văn bằng hành nghề đã thẩm định',
    defaultPercent: 10,
  },
]

const ALL_SORT_VALUES = SORT_OPTIONS.map((opt) => opt.value)

function normalizeSortBy(raw) {
  if (typeof raw === 'number' && raw in SORT_BY_CODE_MAP) {
    return SORT_BY_CODE_MAP[raw]
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return null
    const asNum = Number(trimmed)
    if (!Number.isNaN(asNum) && asNum in SORT_BY_CODE_MAP) {
      return SORT_BY_CODE_MAP[asNum]
    }
    return SORT_BY_LOWER_MAP[trimmed.toLowerCase()] || null
  }
  return null
}

function toPercent(rawWeight, fallbackPercent) {
  const num = Number(rawWeight)
  if (!Number.isFinite(num) || num < 0) return fallbackPercent
  // BE lưu tỷ trọng thang 0..1 (VD: 0.35 -> 35%). Nếu đã là > 1 thì giữ nguyên trong [0, 100].
  const pct = num <= 1 ? Math.round(num * 100) : Math.round(num)
  return Math.min(100, Math.max(0, pct))
}

function createDefaultForm() {
  return {
    ratingWeight: 35,
    completedConsultationsWeight: 25,
    reviewsCountWeight: 15,
    slotAvailabilityWeight: 15,
    verifiedCertificateWeight: 10,
    defaultSortBy: 'Recommended',
    requireVerifiedCertificate: false,
    allowedSortOptions: [...ALL_SORT_VALUES],
    searchableFields: {
      searchInFullName: true,
      searchInJobTitle: true,
      searchInCompanyName: true,
      searchInBio: true,
      searchInSpecializations: true,
      searchInCertificates: true,
    },
    featuredSpecializationIds: [],
  }
}

function mapDtoToForm(configData) {
  const defaults = createDefaultForm()
  if (!configData || typeof configData !== 'object') return defaults

  const weights = configData.rankingWeights || {}
  const fields = configData.searchableFields || {}

  const defaultSortBy = normalizeSortBy(configData.defaultSortBy) || defaults.defaultSortBy

  const normalizedAllowed = Array.isArray(configData.allowedSortOptions)
    ? Array.from(new Set(configData.allowedSortOptions.map(normalizeSortBy).filter(Boolean)))
    : [...ALL_SORT_VALUES]

  const allowedSortOptions =
    normalizedAllowed.length > 0 ? normalizedAllowed : [...ALL_SORT_VALUES]
  if (!allowedSortOptions.includes(defaultSortBy)) {
    allowedSortOptions.unshift(defaultSortBy)
  }

  const featuredSpecializationIds = Array.isArray(configData.featuredSpecializationIds)
    ? Array.from(
        new Set(
          configData.featuredSpecializationIds
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0)
        )
      )
    : []

  return {
    ratingWeight: toPercent(weights.ratingWeight, defaults.ratingWeight),
    completedConsultationsWeight: toPercent(
      weights.completedConsultationsWeight,
      defaults.completedConsultationsWeight
    ),
    reviewsCountWeight: toPercent(weights.reviewsCountWeight, defaults.reviewsCountWeight),
    slotAvailabilityWeight: toPercent(
      weights.slotAvailabilityWeight,
      defaults.slotAvailabilityWeight
    ),
    verifiedCertificateWeight: toPercent(
      weights.verifiedCertificateWeight,
      defaults.verifiedCertificateWeight
    ),
    defaultSortBy,
    requireVerifiedCertificate: Boolean(configData.requireVerifiedCertificate),
    allowedSortOptions,
    searchableFields: {
      searchInFullName: Boolean(fields.searchInFullName ?? true),
      searchInJobTitle: Boolean(fields.searchInJobTitle ?? true),
      searchInCompanyName: Boolean(fields.searchInCompanyName ?? true),
      searchInBio: Boolean(fields.searchInBio ?? true),
      searchInSpecializations: Boolean(fields.searchInSpecializations ?? true),
      searchInCertificates: Boolean(fields.searchInCertificates ?? true),
    },
    featuredSpecializationIds,
  }
}

function mapFormToDto(form) {
  const allowedSortOptions = Array.from(
    new Set([...(form.allowedSortOptions || []), form.defaultSortBy].filter(Boolean))
  )

  return {
    defaultSortBy: form.defaultSortBy,
    requireVerifiedCertificate: Boolean(form.requireVerifiedCertificate),
    featuredSpecializationIds: (form.featuredSpecializationIds || []).map((id) => Number(id)),
    allowedSortOptions:
      allowedSortOptions.length > 0 ? allowedSortOptions : [...ALL_SORT_VALUES],
    searchableFields: {
      searchInFullName: Boolean(form.searchableFields.searchInFullName),
      searchInJobTitle: Boolean(form.searchableFields.searchInJobTitle),
      searchInCompanyName: Boolean(form.searchableFields.searchInCompanyName),
      searchInBio: Boolean(form.searchableFields.searchInBio),
      searchInSpecializations: Boolean(form.searchableFields.searchInSpecializations),
      searchInCertificates: Boolean(form.searchableFields.searchInCertificates),
    },
    rankingWeights: {
      ratingWeight: Number((Number(form.ratingWeight || 0) / 100).toFixed(4)),
      completedConsultationsWeight: Number(
        (Number(form.completedConsultationsWeight || 0) / 100).toFixed(4)
      ),
      reviewsCountWeight: Number((Number(form.reviewsCountWeight || 0) / 100).toFixed(4)),
      slotAvailabilityWeight: Number((Number(form.slotAvailabilityWeight || 0) / 100).toFixed(4)),
      verifiedCertificateWeight: Number(
        (Number(form.verifiedCertificateWeight || 0) / 100).toFixed(4)
      ),
    },
  }
}

export function ExpertSearchConfigTab({ onShowToast }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [specializations, setSpecializations] = useState([])
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })
  const [form, setForm] = useState(createDefaultForm)

  const notify = (title, message, type = 'success') => {
    if (onShowToast) {
      onShowToast(title, message, type)
    } else {
      setNotice({ open: true, type, title, description: message })
    }
  }

  const totalWeight = WEIGHT_FIELDS.reduce((sum, w) => sum + Number(form[w.key] || 0), 0)
  const isWeightValid = Math.abs(totalWeight - 100) <= 0.01

  const enabledSearchFieldCount = SEARCHABLE_FIELD_OPTIONS.filter(
    (f) => form.searchableFields[f.key]
  ).length

  useEffect(() => {
    let active = true
    const loadInitialData = async () => {
      try {
        const [configData, specsData] = await Promise.all([
          expertSearchConfigService.getConfig(),
          expertService.getSpecializations(true).catch(() => []),
        ])
        if (!active) return
        setForm(mapDtoToForm(configData))
        setSpecializations(Array.isArray(specsData) ? specsData : [])
      } catch (err) {
        if (!active) return
        const msg = err?.message || 'Không thể tải cấu hình đề xuất chuyên gia.'
        if (onShowToast) {
          onShowToast('Lỗi tải dữ liệu', msg, 'error')
        } else {
          setNotice({ open: true, type: 'error', title: 'Lỗi tải dữ liệu', description: msg })
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadInitialData()
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAutoBalanceWeights = () => {
    if (totalWeight <= 0) {
      setForm((prev) => ({
        ...prev,
        ratingWeight: 35,
        completedConsultationsWeight: 25,
        reviewsCountWeight: 15,
        slotAvailabilityWeight: 15,
        verifiedCertificateWeight: 10,
      }))
      return
    }

    const keys = WEIGHT_FIELDS.map((w) => w.key)
    const factor = 100 / totalWeight
    let runningSum = 0
    const updated = {}

    keys.forEach((key, idx) => {
      if (idx === keys.length - 1) {
        updated[key] = Math.max(0, Math.round(100 - runningSum))
      } else {
        const val = Math.round(Number(form[key] || 0) * factor)
        updated[key] = val
        runningSum += val
      }
    })

    setForm((prev) => ({ ...prev, ...updated }))
  }

  const handleChangeDefaultSort = (value) => {
    setForm((prev) => {
      const nextAllowed = prev.allowedSortOptions.includes(value)
        ? prev.allowedSortOptions
        : [value, ...prev.allowedSortOptions]
      return {
        ...prev,
        defaultSortBy: value,
        allowedSortOptions: nextAllowed,
      }
    })
  }

  const toggleAllowedSortOption = (sortValue) => {
    setForm((prev) => {
      const exists = prev.allowedSortOptions.includes(sortValue)
      if (exists && sortValue === prev.defaultSortBy) {
        notify(
          'Không thể ẩn tiêu chí mặc định',
          'Tiêu chí đang được chọn làm thứ tự sắp xếp mặc định phải luôn được bật.',
          'error'
        )
        return prev
      }
      if (exists && prev.allowedSortOptions.length <= 1) {
        notify('Lưu ý', 'Cần bật ít nhất một tiêu chí sắp xếp cho người dùng.', 'error')
        return prev
      }
      const next = exists
        ? prev.allowedSortOptions.filter((v) => v !== sortValue)
        : [...prev.allowedSortOptions, sortValue]
      return { ...prev, allowedSortOptions: next }
    })
  }

  const toggleSearchField = (fieldKey) => {
    setForm((prev) => {
      const currentlyChecked = Boolean(prev.searchableFields[fieldKey])
      const activeCount = SEARCHABLE_FIELD_OPTIONS.filter(
        (f) => prev.searchableFields[f.key]
      ).length
      if (currentlyChecked && activeCount <= 1) {
        notify('Lưu ý', 'Cần bật ít nhất một trường thông tin tìm kiếm.', 'error')
        return prev
      }
      return {
        ...prev,
        searchableFields: {
          ...prev.searchableFields,
          [fieldKey]: !currentlyChecked,
        },
      }
    })
  }

  const toggleFeaturedSpec = (specId) => {
    const numericId = Number(specId)
    setForm((prev) => {
      const exists = prev.featuredSpecializationIds.includes(numericId)
      const next = exists
        ? prev.featuredSpecializationIds.filter((id) => id !== numericId)
        : [...prev.featuredSpecializationIds, numericId]
      return { ...prev, featuredSpecializationIds: next }
    })
  }

  const handleSave = async () => {
    if (!isWeightValid) {
      notify(
        'Trọng số chưa hợp lệ',
        `Tổng trọng số hiện tại là ${totalWeight}%. Vui lòng điều chỉnh đúng bằng 100%.`,
        'error'
      )
      return
    }
    if (enabledSearchFieldCount === 0) {
      notify('Phạm vi tìm kiếm chưa hợp lệ', 'Cần bật ít nhất một trường dữ liệu tìm kiếm.', 'error')
      return
    }

    setIsSaving(true)
    try {
      const payload = mapFormToDto(form)
      const updated = await expertSearchConfigService.updateConfig(payload)
      if (updated) {
        setForm(mapDtoToForm(updated))
      }
      notify(
        'Đã lưu cấu hình',
        'Quy tắc đề xuất và tìm kiếm chuyên gia đã được cập nhật và áp dụng ngay trên ứng dụng.'
      )
    } catch (err) {
      notify('Lỗi cập nhật', err?.message || 'Không thể lưu cấu hình lúc này.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmReset = async () => {
    setIsResetting(true)
    try {
      const resetData = await expertSearchConfigService.resetDefaults()
      setForm(mapDtoToForm(resetData))
      setConfirmResetOpen(false)
      notify('Đã khôi phục mặc định', 'Cấu hình đề xuất chuyên gia đã về mức chuẩn ban đầu.')
    } catch (err) {
      notify('Lỗi khôi phục', err?.message || 'Không thể khôi phục mặc định.', 'error')
    } finally {
      setIsResetting(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <SectionLoading title="Đang tải cấu hình đề xuất chuyên gia..." minHeight="min-h-[220px]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Thanh điều khiển chính */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h3 className="text-sm font-bold text-on-surface">
              Quy tắc đề xuất & Tìm kiếm chuyên gia
            </h3>
            <p className="text-xs text-on-surface-variant">
              Thiết lập trọng số xếp hạng đề xuất, thứ tự sắp xếp mặc định, điều kiện chứng chỉ và phạm vi tìm kiếm đồng bộ với ứng dụng di động.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmResetOpen(true)}
              disabled={isResetting || isSaving}
            >
              Khôi phục mặc định
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || !isWeightValid}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CỘT TRÁI: TRỌNG SỐ XẾP HẠNG ĐỀ XUẤT */}
        <Card className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-outline-variant/30">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-on-surface">
                    Trọng số thuật toán đề xuất
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tổng tỷ trọng của 5 tiêu chí phải bằng 100%
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={isWeightValid ? 'secondary' : 'destructive'} className="tabular-nums">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isWeightValid ? 'bg-emerald-600' : 'bg-red-600'
                      }`}
                    />
                    Tổng: {totalWeight}% / 100%
                  </Badge>
                  {!isWeightValid && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoBalanceWeights}
                      className="h-7 px-2.5 text-[11px]"
                    >
                      Tự cân bằng
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 flex flex-col gap-3">
              {/* Thanh phân bổ tỷ trọng */}
              <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden flex">
                <div
                  style={{ width: `${Math.min(100, totalWeight)}%` }}
                  className={`h-full transition-all duration-300 ${
                    isWeightValid ? 'bg-primary' : 'bg-red-600'
                  }`}
                />
              </div>

              <div className="flex flex-col divide-y divide-outline-variant/30">
                {WEIGHT_FIELDS.map((w) => {
                  const val = Number(form[w.key] || 0)
                  return (
                    <div key={w.key} className="py-3 first:pt-1 last:pb-0 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-on-surface">{w.label}</p>
                          <p className="text-[11px] text-on-surface-variant">{w.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={val}
                            aria-label={w.label}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                [w.key]: Math.min(100, Math.max(0, Number(e.target.value) || 0)),
                              }))
                            }
                            className="w-14 h-8 text-center rounded-md border border-outline-variant/60 bg-surface-container-lowest font-semibold text-xs text-on-surface tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-xs font-medium text-on-surface-variant">%</span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={val}
                        aria-label={`Thanh trượt ${w.label}`}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            [w.key]: Number(e.target.value),
                          }))
                        }
                        className="w-full accent-primary cursor-pointer h-1.5 bg-surface-container-high rounded-lg"
                      />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </div>

          <CardFooter className="pt-3 border-t border-outline-variant/30 text-[11px] text-on-surface-variant justify-between">
            <span>
              Trọng số được áp dụng cho thứ hạng Top chuyên gia đề xuất khi chọn &quot;Đề xuất ưu tiên&quot;.
            </span>
          </CardFooter>
        </Card>

        {/* CỘT PHẢI: SẮP XẾP, ĐIỀU KIỆN HIỂN THỊ & PHẠM VI TÌM KIẾM */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Tiêu chuẩn sắp xếp & Hiển thị */}
          <Card>
            <CardHeader className="pb-3 border-b border-outline-variant/30">
              <CardTitle className="text-sm font-bold text-on-surface">
                Sắp xếp mặc định & Điều kiện hiển thị
              </CardTitle>
              <CardDescription className="text-xs">
                Quy định cách xếp hạng Top chuyên gia đề xuất và tùy chọn sắp xếp trên ứng dụng
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Thứ tự sắp xếp mặc định</Label>
                <Select value={form.defaultSortBy} onValueChange={handleChangeDefaultSort}>
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Chọn tiêu chí sắp xếp" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-low/40 cursor-pointer">
                <Checkbox
                  checked={form.requireVerifiedCertificate}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      requireVerifiedCertificate: Boolean(checked),
                    }))
                  }
                  className="mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-on-surface">
                    Bắt buộc có chứng chỉ hành nghề đã xác thực
                  </span>
                  <span className="text-[11px] text-on-surface-variant">
                    Chỉ hiển thị chuyên gia có ít nhất 1 chứng chỉ đã được thẩm định hợp lệ
                  </span>
                </div>
              </label>

              <div className="flex flex-col gap-1.5 pt-2 border-t border-outline-variant/30">
                <Label className="text-xs font-semibold">
                  Các tùy chọn sắp xếp hiển thị cho người dùng
                </Label>
                <p className="text-[11px] text-on-surface-variant">
                  Người dùng chỉ chọn được các tiêu chí được bật trong bộ lọc sắp xếp.
                </p>
                <div className="flex flex-col gap-1.5 mt-1">
                  {SORT_OPTIONS.map((opt) => {
                    const checked = form.allowedSortOptions.includes(opt.value)
                    const isDefault = opt.value === form.defaultSortBy
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'border-outline-variant bg-surface-container-low/70'
                            : 'border-outline-variant/40 bg-surface-container-lowest opacity-75'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => toggleAllowedSortOption(opt.value)}
                          />
                          <span className="font-medium text-on-surface">{opt.label}</span>
                        </div>
                        {isDefault && (
                          <Badge variant="secondary" className="text-[10px]">
                            Mặc định
                          </Badge>
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Phạm vi tìm kiếm & Lĩnh vực ưu tiên */}
          <Card>
            <CardHeader className="pb-3 border-b border-outline-variant/30">
              <CardTitle className="text-sm font-bold text-on-surface">
                Phạm vi tìm kiếm & Lĩnh vực ưu tiên
              </CardTitle>
              <CardDescription className="text-xs">
                Các trường dữ liệu được quét khi người dùng nhập từ khóa
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                {SEARCHABLE_FIELD_OPTIONS.map((f) => {
                  const checked = Boolean(form.searchableFields[f.key])
                  return (
                    <label
                      key={f.key}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        checked
                          ? 'border-outline-variant bg-surface-container-low/70'
                          : 'border-outline-variant/40 bg-surface-container-lowest opacity-75'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSearchField(f.key)}
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-on-surface">{f.label}</span>
                          <span className="text-[11px] text-on-surface-variant">{f.desc}</span>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>

              {specializations.length > 0 && (
                <div className="flex flex-col gap-2 pt-3 border-t border-outline-variant/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Lĩnh vực ưu tiên đề xuất (+15 điểm)</Label>
                    {form.featuredSpecializationIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, featuredSpecializationIds: [] }))}
                        className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                      >
                        Bỏ lọc ({form.featuredSpecializationIds.length})
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-on-surface-variant">
                    Chuyên gia thuộc các lĩnh vực này sẽ được cộng điểm thưởng ưu tiên khi xếp hạng đề xuất. Để trống nếu áp dụng đồng đều.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {specializations.map((spec) => {
                      const active = form.featuredSpecializationIds.includes(Number(spec.id))
                      return (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => toggleFeaturedSpec(spec.id)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                            active
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-surface-container-lowest text-on-surface border-outline-variant/60 hover:bg-surface-container-low'
                          }`}
                        >
                          {spec.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Khôi phục cấu hình mặc định"
        description="Đưa toàn bộ trọng số xếp hạng, thứ tự mặc định và phạm vi tìm kiếm chuyên gia về mức mặc định ban đầu?"
        confirmLabel={isResetting ? 'Đang khôi phục...' : 'Khôi phục'}
        onConfirm={handleConfirmReset}
      />

      <NotificationDialog
        open={notice.open}
        onOpenChange={(open) => setNotice((prev) => ({ ...prev, open }))}
        type={notice.type}
        title={notice.title}
        description={notice.description}
      />
    </div>
  )
}
