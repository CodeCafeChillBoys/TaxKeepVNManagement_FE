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

const SORT_OPTIONS = [
  { value: 'Recommended', label: 'Đề xuất tốt nhất' },
  { value: 'RatingDesc', label: 'Điểm đánh giá cao nhất' },
  { value: 'ExperienceDesc', label: 'Kinh nghiệm lâu năm nhất' },
  { value: 'FeeAsc', label: 'Mức phí thấp đến cao' },
  { value: 'FeeDesc', label: 'Mức phí cao đến thấp' },
  { value: 'CompletedSessionsDesc', label: 'Số ca tư vấn hoàn thành nhiều nhất' },
]

const SEARCHABLE_FIELD_OPTIONS = [
  { key: 'fullName', beKey: 'searchInFullName', label: 'Họ và tên chuyên gia', desc: 'Tìm theo tên hiển thị' },
  { key: 'jobTitle', beKey: 'searchInJobTitle', label: 'Chức danh nghề nghiệp', desc: 'Ví dụ: Kế toán trưởng, Đại lý thuế' },
  { key: 'companyName', beKey: 'searchInCompanyName', label: 'Đơn vị công tác', desc: 'Tên công ty hoặc tổ chức hành nghề' },
  { key: 'specialization', beKey: 'searchInSpecializations', label: 'Lĩnh vực tư vấn', desc: 'Tìm theo tên chuyên ngành thuế' },
  { key: 'bio', beKey: 'searchInBio', label: 'Giới thiệu & Kinh nghiệm', desc: 'Tìm từ khóa trong tóm tắt chuyên môn' },
  { key: 'certificates', beKey: 'searchInCertificates', label: 'Chứng chỉ hành nghề', desc: 'Tìm theo tên văn bằng, chứng chỉ đã cấp' },
]

const DEFAULT_CRITERIA_VALUES = {
  ratingWeight: 4.5,
  totalSessionsWeight: 20,
  totalReviewsWeight: 10,
  experienceWeight: 5,
  availabilityWeight: 7,
  verifiedCertWeight: 1,
}

const LOCAL_STORAGE_KEY = 'taxkeep_expert_search_unit_config_v1'

const WEIGHT_FIELDS = [
  {
    key: 'ratingWeight',
    label: 'Điểm đánh giá trung bình',
    desc: 'Mức độ hài lòng từ khách hàng (thang 5 sao)',
    unit: 'sao',
    min: 0,
    max: 5,
    step: 0.5,
  },
  {
    key: 'totalSessionsWeight',
    label: 'Số ca tư vấn hoàn thành',
    desc: 'Kinh nghiệm giải quyết hồ sơ thực tế trên hệ thống (mốc chuẩn 50 ca)',
    unit: 'ca',
    min: 0,
    max: 50,
    step: 1,
  },
  {
    key: 'totalReviewsWeight',
    label: 'Số lượt nhận xét',
    desc: 'Độ phủ phản hồi từ người nộp thuế (mốc chuẩn 50 lượt)',
    unit: 'lượt',
    min: 0,
    max: 50,
    step: 1,
  },
  {
    key: 'experienceWeight',
    label: 'Số năm hành nghề',
    desc: 'Thâm niên công tác trong lĩnh vực thuế và kế toán',
    unit: 'năm',
    min: 0,
    max: 30,
    step: 1,
  },
  {
    key: 'availabilityWeight',
    label: 'Lịch rảnh sắp tới',
    desc: 'Ưu tiên chuyên gia có khung giờ trống trong số ngày tới',
    unit: 'ngày',
    min: 1,
    max: 30,
    step: 1,
  },
  {
    key: 'verifiedCertWeight',
    label: 'Chứng chỉ đã xác thực',
    desc: 'Số văn bằng hành nghề đã được thẩm định và xác thực',
    unit: 'chứng chỉ',
    min: 0,
    max: 10,
    step: 1,
  },
]

function parseSearchableFieldsFromBe(searchableFields) {
  if (Array.isArray(searchableFields) && searchableFields.length > 0) {
    return searchableFields
  }
  if (searchableFields && typeof searchableFields === 'object') {
    const mapped = SEARCHABLE_FIELD_OPTIONS.filter(
      (opt) => searchableFields[opt.beKey] !== false
    ).map((opt) => opt.key)
    return mapped.length > 0 ? mapped : SEARCHABLE_FIELD_OPTIONS.map((o) => o.key)
  }
  return SEARCHABLE_FIELD_OPTIONS.map((o) => o.key)
}

function buildSearchableFieldsForBe(selectedKeys) {
  const set = new Set(Array.isArray(selectedKeys) ? selectedKeys : [])
  return {
    searchInFullName: set.has('fullName'),
    searchInJobTitle: set.has('jobTitle'),
    searchInCompanyName: set.has('companyName'),
    searchInBio: set.has('bio'),
    searchInSpecializations: set.has('specialization'),
    searchInCertificates: set.has('certificates'),
  }
}

function buildRankingWeightsForBe(form) {
  const ratingNorm = Math.max(0, Number(form.ratingWeight || 0)) / 5
  const sessionsNorm = Math.max(0, Number(form.totalSessionsWeight || 0)) / 50
  const reviewsNorm = Math.max(0, Number(form.totalReviewsWeight || 0)) / 50
  const slotNorm = Math.max(0, Number(form.availabilityWeight || 0)) / 30
  const certNorm = Math.max(0, Number(form.verifiedCertWeight || 0)) / 10
  const sum = ratingNorm + sessionsNorm + reviewsNorm + slotNorm + certNorm

  if (sum <= 0) {
    return {
      ratingWeight: 0.35,
      completedConsultationsWeight: 0.25,
      reviewsCountWeight: 0.15,
      slotAvailabilityWeight: 0.15,
      verifiedCertificateWeight: 0.1,
    }
  }

  const rw = Number((ratingNorm / sum).toFixed(2))
  const cw = Number((sessionsNorm / sum).toFixed(2))
  const revW = Number((reviewsNorm / sum).toFixed(2))
  const sw = Number((slotNorm / sum).toFixed(2))
  const vw = Number(Math.max(0, 1 - (rw + cw + revW + sw)).toFixed(2))

  return {
    ratingWeight: rw,
    completedConsultationsWeight: cw,
    reviewsCountWeight: revW,
    slotAvailabilityWeight: sw,
    verifiedCertificateWeight: vw,
  }
}

function readLocalUnitConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeLocalUnitConfig(data) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore storage errors
  }
}

export function ExpertSearchConfigTab({ onShowToast }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [specializations, setSpecializations] = useState([])
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const [form, setForm] = useState({
    ...DEFAULT_CRITERIA_VALUES,
    defaultSortBy: 'Recommended',
    featuredMaxCount: 6,
    featuredMinRating: 4.0,
    featuredMinSessions: 0,
    onlyShowExpertsWithAvailableSlots: false,
    prioritizeTodayAvailableSlots: true,
    searchableFields: SEARCHABLE_FIELD_OPTIONS.map((o) => o.key),
    featuredSpecializationIds: [],
    updatedAt: null,
  })

  const notify = (title, message, type = 'success') => {
    if (onShowToast) {
      onShowToast(title, message, type)
    } else {
      setNotice({ open: true, type, title, description: message })
    }
  }

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [configData, specsData] = await Promise.all([
        expertSearchConfigService.getConfig(),
        expertService.getSpecializations(true).catch(() => []),
      ])

      const localSaved = readLocalUnitConfig()

      if (configData) {
        const rawSort =
          configData.defaultSortBy === 'SessionsDesc'
            ? 'CompletedSessionsDesc'
            : configData.defaultSortBy || 'Recommended'

        setForm({
          ratingWeight: Number(
            localSaved?.ratingWeight ?? DEFAULT_CRITERIA_VALUES.ratingWeight
          ),
          totalSessionsWeight: Number(
            localSaved?.totalSessionsWeight ?? DEFAULT_CRITERIA_VALUES.totalSessionsWeight
          ),
          totalReviewsWeight: Number(
            localSaved?.totalReviewsWeight ?? DEFAULT_CRITERIA_VALUES.totalReviewsWeight
          ),
          experienceWeight: Number(
            localSaved?.experienceWeight ?? DEFAULT_CRITERIA_VALUES.experienceWeight
          ),
          availabilityWeight: Number(
            localSaved?.availabilityWeight ?? DEFAULT_CRITERIA_VALUES.availabilityWeight
          ),
          verifiedCertWeight: Number(
            localSaved?.verifiedCertWeight ??
              (configData.requireVerifiedCertificate ? 1 : DEFAULT_CRITERIA_VALUES.verifiedCertWeight)
          ),
          defaultSortBy: rawSort,
          featuredMaxCount: Number(localSaved?.featuredMaxCount ?? configData.featuredMaxCount ?? 6),
          featuredMinRating: Number(localSaved?.featuredMinRating ?? configData.featuredMinRating ?? 4.0),
          featuredMinSessions: Number(
            localSaved?.featuredMinSessions ?? configData.featuredMinSessions ?? 0
          ),
          onlyShowExpertsWithAvailableSlots: Boolean(
            localSaved?.onlyShowExpertsWithAvailableSlots ??
              configData.onlyShowExpertsWithAvailableSlots ??
              false
          ),
          prioritizeTodayAvailableSlots: Boolean(
            localSaved?.prioritizeTodayAvailableSlots ??
              configData.prioritizeTodayAvailableSlots ??
              true
          ),
          searchableFields: parseSearchableFieldsFromBe(configData.searchableFields),
          featuredSpecializationIds: Array.isArray(configData.featuredSpecializationIds)
            ? configData.featuredSpecializationIds
            : [],
          updatedAt: configData.updatedAt || localSaved?.updatedAt || null,
        })
      }
      setSpecializations(Array.isArray(specsData) ? specsData : [])
    } catch (err) {
      notify('Lỗi tải dữ liệu', err?.message || 'Không thể tải cấu hình đề xuất chuyên gia.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleSearchField = (fieldKey) => {
    setForm((prev) => {
      const exists = prev.searchableFields.includes(fieldKey)
      if (exists && prev.searchableFields.length <= 1) {
        notify('Lưu ý', 'Cần bật ít nhất một trường thông tin tìm kiếm.', 'error')
        return prev
      }
      const next = exists
        ? prev.searchableFields.filter((f) => f !== fieldKey)
        : [...prev.searchableFields, fieldKey]
      return { ...prev, searchableFields: next }
    })
  }

  const toggleFeaturedSpec = (specId) => {
    setForm((prev) => {
      const exists = prev.featuredSpecializationIds.includes(specId)
      const next = exists
        ? prev.featuredSpecializationIds.filter((id) => id !== specId)
        : [...prev.featuredSpecializationIds, specId]
      return { ...prev, featuredSpecializationIds: next }
    })
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const normalizedSort =
        form.defaultSortBy === 'SessionsDesc' ? 'CompletedSessionsDesc' : form.defaultSortBy

      const payload = {
        defaultSortBy: normalizedSort,
        requireVerifiedCertificate: Number(form.verifiedCertWeight || 0) > 0,
        featuredSpecializationIds: form.featuredSpecializationIds,
        searchableFields: buildSearchableFieldsForBe(form.searchableFields),
        rankingWeights: buildRankingWeightsForBe(form),
        allowedSortOptions: SORT_OPTIONS.map((o) => o.value),
      }

      const updated = await expertSearchConfigService.updateConfig(payload)
      const nowIso = updated?.updatedAt || new Date().toISOString()

      writeLocalUnitConfig({
        ratingWeight: Number(form.ratingWeight),
        totalSessionsWeight: Number(form.totalSessionsWeight),
        totalReviewsWeight: Number(form.totalReviewsWeight),
        experienceWeight: Number(form.experienceWeight),
        availabilityWeight: Number(form.availabilityWeight),
        verifiedCertWeight: Number(form.verifiedCertWeight),
        featuredMaxCount: Number(form.featuredMaxCount),
        featuredMinRating: Number(form.featuredMinRating),
        featuredMinSessions: Number(form.featuredMinSessions),
        onlyShowExpertsWithAvailableSlots: Boolean(form.onlyShowExpertsWithAvailableSlots),
        prioritizeTodayAvailableSlots: Boolean(form.prioritizeTodayAvailableSlots),
        updatedAt: nowIso,
      })

      setForm((prev) => ({ ...prev, defaultSortBy: normalizedSort, updatedAt: nowIso }))
      notify('Đã lưu cấu hình', 'Quy tắc đề xuất và tìm kiếm chuyên gia đã được cập nhật.')
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
      const nowIso = resetData?.updatedAt || new Date().toISOString()

      try {
        localStorage.removeItem(LOCAL_STORAGE_KEY)
      } catch {
        // ignore
      }

      setForm({
        ...DEFAULT_CRITERIA_VALUES,
        defaultSortBy:
          resetData?.defaultSortBy === 'SessionsDesc'
            ? 'CompletedSessionsDesc'
            : resetData?.defaultSortBy || 'Recommended',
        featuredMaxCount: 6,
        featuredMinRating: 4.0,
        featuredMinSessions: 0,
        onlyShowExpertsWithAvailableSlots: false,
        prioritizeTodayAvailableSlots: true,
        searchableFields: parseSearchableFieldsFromBe(resetData?.searchableFields),
        featuredSpecializationIds: Array.isArray(resetData?.featuredSpecializationIds)
          ? resetData.featuredSpecializationIds
          : [],
        updatedAt: nowIso,
      })
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
              Thiết lập định mức xếp hạng, tiêu chuẩn chọn chuyên gia nổi bật và phạm vi tìm kiếm trên ứng dụng.
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
              disabled={isSaving}
            >
              {isSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CỘT TRÁI: TRỌNG SỐ & ĐỊNH MỨC XẾP HẠNG ĐỀ XUẤT */}
        <Card className="lg:col-span-7 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-outline-variant/30">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold text-on-surface">
                    Trọng số xếp hạng đề xuất
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Định mức chuẩn của 6 tiêu chí dùng để tính điểm ưu tiên đề xuất chuyên gia
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="tabular-nums">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    6 tiêu chí đang áp dụng
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-3 flex flex-col gap-3">
              <div className="flex flex-col divide-y divide-outline-variant/30">
                {WEIGHT_FIELDS.map((w) => {
                  const rawVal = form[w.key]
                  const sliderVal =
                    rawVal === '' || rawVal === null || rawVal === undefined
                      ? w.min
                      : Math.min(w.max, Math.max(w.min, Number(rawVal) || 0))
                  return (
                    <div key={w.key} className="py-3 first:pt-1 last:pb-0 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-on-surface">{w.label}</p>
                          <p className="text-[11px] text-on-surface-variant">{w.desc}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            type="number"
                            min={w.min}
                            max={w.max}
                            step={w.step}
                            value={rawVal ?? ''}
                            aria-label={w.label}
                            onChange={(e) => {
                              const text = e.target.value
                              if (text === '') {
                                setForm((prev) => ({ ...prev, [w.key]: '' }))
                                return
                              }
                              const num = Number(text)
                              if (!Number.isNaN(num)) {
                                setForm((prev) => ({
                                  ...prev,
                                  [w.key]: Math.min(w.max, num),
                                }))
                              }
                            }}
                            onBlur={() => {
                              setForm((prev) => {
                                const current = prev[w.key]
                                const parsed =
                                  current === '' || Number.isNaN(Number(current))
                                    ? w.min
                                    : Math.min(w.max, Math.max(w.min, Number(current)))
                                return { ...prev, [w.key]: parsed }
                              })
                            }}
                            className="w-16 h-8 text-center rounded-md border border-outline-variant/60 bg-surface-container-lowest font-semibold text-xs text-on-surface tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <span className="text-xs font-medium text-on-surface-variant min-w-[56px]">
                            {w.unit}
                          </span>
                        </div>
                      </div>

                      <input
                        type="range"
                        min={w.min}
                        max={w.max}
                        step={w.step}
                        value={sliderVal}
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
            <span>Hệ thống tự động quy đổi định mức các tiêu chí sang điểm xếp hạng đề xuất.</span>
            {form.updatedAt && (
              <span className="tabular-nums">
                Cập nhật: {new Date(form.updatedAt).toLocaleString('vi-VN')}
              </span>
            )}
          </CardFooter>
        </Card>

        {/* CỘT PHẢI: CHUYÊN GIA NỔI BẬT & TÌM KIẾM */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Tiêu chuẩn hiển thị chuyên gia nổi bật */}
          <Card>
            <CardHeader className="pb-3 border-b border-outline-variant/30">
              <CardTitle className="text-sm font-bold text-on-surface">
                Tiêu chuẩn hiển thị chuyên gia nổi bật
              </CardTitle>
              <CardDescription className="text-xs">
                Điều kiện lọc danh sách chuyên gia đề xuất đầu trang
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col gap-3.5">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold">Thứ tự sắp xếp mặc định</Label>
                <Select
                  value={form.defaultSortBy}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, defaultSortBy: value }))}
                >
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

              <div className="grid grid-cols-3 gap-2.5">
                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-medium text-on-surface-variant">
                    Số lượng tối đa
                  </Label>
                  <div className="flex items-center h-9 px-2.5 rounded-md border border-outline-variant/60 bg-surface-container-lowest focus-within:ring-1 focus-within:ring-primary">
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={form.featuredMaxCount ?? ''}
                      onChange={(e) => {
                        const text = e.target.value
                        if (text === '') {
                          setForm((prev) => ({ ...prev, featuredMaxCount: '' }))
                          return
                        }
                        const num = Number(text)
                        if (!Number.isNaN(num)) {
                          setForm((prev) => ({
                            ...prev,
                            featuredMaxCount: Math.min(20, num),
                          }))
                        }
                      }}
                      onBlur={() =>
                        setForm((prev) => ({
                          ...prev,
                          featuredMaxCount: Math.min(
                            20,
                            Math.max(1, Number(prev.featuredMaxCount) || 1)
                          ),
                        }))
                      }
                      className="w-full min-w-0 bg-transparent text-xs font-semibold text-on-surface tabular-nums focus:outline-none"
                    />
                    <span className="text-[11px] text-on-surface-variant shrink-0 ml-1 select-none">
                      người
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-medium text-on-surface-variant">
                    Số sao tối thiểu
                  </Label>
                  <div className="flex items-center h-9 px-2.5 rounded-md border border-outline-variant/60 bg-surface-container-lowest focus-within:ring-1 focus-within:ring-primary">
                    <input
                      type="number"
                      min={0}
                      max={5}
                      step={0.5}
                      value={form.featuredMinRating ?? ''}
                      onChange={(e) => {
                        const text = e.target.value
                        if (text === '') {
                          setForm((prev) => ({ ...prev, featuredMinRating: '' }))
                          return
                        }
                        const num = Number(text)
                        if (!Number.isNaN(num)) {
                          setForm((prev) => ({
                            ...prev,
                            featuredMinRating: Math.min(5, num),
                          }))
                        }
                      }}
                      onBlur={() =>
                        setForm((prev) => ({
                          ...prev,
                          featuredMinRating: Math.min(
                            5,
                            Math.max(0, Number(prev.featuredMinRating) || 0)
                          ),
                        }))
                      }
                      className="w-full min-w-0 bg-transparent text-xs font-semibold text-on-surface tabular-nums focus:outline-none"
                    />
                    <span className="text-[11px] text-on-surface-variant shrink-0 ml-1 select-none">
                      sao
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-medium text-on-surface-variant">
                    Số ca tối thiểu
                  </Label>
                  <div className="flex items-center h-9 px-2.5 rounded-md border border-outline-variant/60 bg-surface-container-lowest focus-within:ring-1 focus-within:ring-primary">
                    <input
                      type="number"
                      min={0}
                      max={1000}
                      value={form.featuredMinSessions ?? ''}
                      onChange={(e) => {
                        const text = e.target.value
                        if (text === '') {
                          setForm((prev) => ({ ...prev, featuredMinSessions: '' }))
                          return
                        }
                        const num = Number(text)
                        if (!Number.isNaN(num)) {
                          setForm((prev) => ({
                            ...prev,
                            featuredMinSessions: Math.min(1000, num),
                          }))
                        }
                      }}
                      onBlur={() =>
                        setForm((prev) => ({
                          ...prev,
                          featuredMinSessions: Math.max(0, Number(prev.featuredMinSessions) || 0),
                        }))
                      }
                      className="w-full min-w-0 bg-transparent text-xs font-semibold text-on-surface tabular-nums focus:outline-none"
                    />
                    <span className="text-[11px] text-on-surface-variant shrink-0 ml-1 select-none">
                      ca
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/30">
                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-low/40 cursor-pointer">
                  <Checkbox
                    checked={form.prioritizeTodayAvailableSlots}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, prioritizeTodayAvailableSlots: Boolean(checked) }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-on-surface">
                      Ưu tiên chuyên gia có lịch rảnh hôm nay
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Cộng thêm điểm ưu tiên nếu chuyên gia còn khung giờ trống trong ngày
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 rounded-lg border border-outline-variant/40 bg-surface-container-low/40 cursor-pointer">
                  <Checkbox
                    checked={form.onlyShowExpertsWithAvailableSlots}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({
                        ...prev,
                        onlyShowExpertsWithAvailableSlots: Boolean(checked),
                      }))
                    }
                    className="mt-0.5"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-on-surface">
                      Ẩn chuyên gia đã kín lịch
                    </span>
                    <span className="text-[11px] text-on-surface-variant">
                      Chỉ hiển thị chuyên gia còn ít nhất 1 khung giờ trống trong 7 ngày tới
                    </span>
                  </div>
                </label>
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
                  const checked = form.searchableFields.includes(f.key)
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
                    <Label className="text-xs font-semibold">Lĩnh vực ưu tiên đề xuất</Label>
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
                    Để trống nếu áp dụng cho tất cả lĩnh vực tư vấn.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {specializations.map((spec) => {
                      const active = form.featuredSpecializationIds.includes(spec.id)
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
        description="Đưa toàn bộ trọng số xếp hạng và tiêu chuẩn tìm kiếm chuyên gia về mức mặc định ban đầu?"
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
