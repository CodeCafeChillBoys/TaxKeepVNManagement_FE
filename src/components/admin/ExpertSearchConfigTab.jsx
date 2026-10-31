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

const SORT_OPTIONS = [
  { value: 'Recommended', label: 'Đề xuất tốt nhất' },
  { value: 'RatingDesc', label: 'Điểm đánh giá cao nhất' },
  { value: 'ExperienceDesc', label: 'Kinh nghiệm lâu năm nhất' },
  { value: 'FeeAsc', label: 'Mức phí thấp đến cao' },
  { value: 'FeeDesc', label: 'Mức phí cao đến thấp' },
  { value: 'SessionsDesc', label: 'Số ca tư vấn hoàn thành nhiều nhất' },
]

const SEARCHABLE_FIELD_OPTIONS = [
  { key: 'fullName', label: 'Họ và tên chuyên gia', desc: 'Tìm theo tên hiển thị' },
  { key: 'jobTitle', label: 'Chức danh nghề nghiệp', desc: 'Ví dụ: Kế toán trưởng, Đại lý thuế' },
  { key: 'companyName', label: 'Đơn vị công tác', desc: 'Tên công ty hoặc tổ chức hành nghề' },
  { key: 'specialization', label: 'Lĩnh vực tư vấn', desc: 'Tìm theo tên chuyên ngành thuế' },
  { key: 'bio', label: 'Giới thiệu & Kinh nghiệm', desc: 'Tìm từ khóa trong tóm tắt chuyên môn' },
]

const WEIGHT_FIELDS = [
  {
    key: 'ratingWeight',
    label: 'Điểm đánh giá trung bình',
    desc: 'Mức độ hài lòng từ khách hàng (thang 5 sao)',
  },
  {
    key: 'totalSessionsWeight',
    label: 'Số ca tư vấn hoàn thành',
    desc: 'Kinh nghiệm giải quyết hồ sơ thực tế trên hệ thống',
  },
  {
    key: 'totalReviewsWeight',
    label: 'Số lượt nhận xét',
    desc: 'Độ phủ phản hồi từ người nộp thuế',
  },
  {
    key: 'experienceWeight',
    label: 'Số năm hành nghề',
    desc: 'Thâm niên công tác trong lĩnh vực thuế và kế toán',
  },
  {
    key: 'availabilityWeight',
    label: 'Lịch rảnh sắp tới',
    desc: 'Ưu tiên chuyên gia có khung giờ trống trong 7 ngày tới',
  },
  {
    key: 'verifiedCertWeight',
    label: 'Chứng chỉ đã xác thực',
    desc: 'Ưu tiên hồ sơ có văn bằng hành nghề đã thẩm định',
  },
]

export function ExpertSearchConfigTab({ onShowToast }) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [specializations, setSpecializations] = useState([])
  const [notice, setNotice] = useState({ open: false, type: 'info', title: '', description: '' })

  const [form, setForm] = useState({
    ratingWeight: 40,
    totalSessionsWeight: 20,
    totalReviewsWeight: 10,
    experienceWeight: 15,
    availabilityWeight: 10,
    verifiedCertWeight: 5,
    defaultSortBy: 'Recommended',
    featuredMaxCount: 6,
    featuredMinRating: 4.0,
    featuredMinSessions: 0,
    onlyShowExpertsWithAvailableSlots: false,
    prioritizeTodayAvailableSlots: true,
    searchableFields: ['fullName', 'jobTitle', 'companyName', 'specialization', 'bio'],
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

  const totalWeight =
    Number(form.ratingWeight || 0) +
    Number(form.totalSessionsWeight || 0) +
    Number(form.totalReviewsWeight || 0) +
    Number(form.experienceWeight || 0) +
    Number(form.availabilityWeight || 0) +
    Number(form.verifiedCertWeight || 0)

  const isWeightValid = Math.abs(totalWeight - 100) <= 0.01

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [configData, specsData] = await Promise.all([
        expertSearchConfigService.getConfig(),
        expertService.getSpecializations(true).catch(() => []),
      ])

      if (configData) {
        setForm({
          ratingWeight: Number(configData.ratingWeight ?? 40),
          totalSessionsWeight: Number(configData.totalSessionsWeight ?? 20),
          totalReviewsWeight: Number(configData.totalReviewsWeight ?? 10),
          experienceWeight: Number(configData.experienceWeight ?? 15),
          availabilityWeight: Number(configData.availabilityWeight ?? 10),
          verifiedCertWeight: Number(configData.verifiedCertWeight ?? 5),
          defaultSortBy: configData.defaultSortBy || 'Recommended',
          featuredMaxCount: Number(configData.featuredMaxCount ?? 6),
          featuredMinRating: Number(configData.featuredMinRating ?? 4.0),
          featuredMinSessions: Number(configData.featuredMinSessions ?? 0),
          onlyShowExpertsWithAvailableSlots: Boolean(configData.onlyShowExpertsWithAvailableSlots),
          prioritizeTodayAvailableSlots: Boolean(configData.prioritizeTodayAvailableSlots ?? true),
          searchableFields: Array.isArray(configData.searchableFields)
            ? configData.searchableFields
            : ['fullName', 'jobTitle', 'companyName', 'specialization', 'bio'],
          featuredSpecializationIds: Array.isArray(configData.featuredSpecializationIds)
            ? configData.featuredSpecializationIds
            : [],
          updatedAt: configData.updatedAt || null,
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

  const handleAutoBalanceWeights = () => {
    if (totalWeight <= 0) {
      setForm((prev) => ({
        ...prev,
        ratingWeight: 40,
        totalSessionsWeight: 20,
        totalReviewsWeight: 10,
        experienceWeight: 15,
        availabilityWeight: 10,
        verifiedCertWeight: 5,
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
    if (!isWeightValid) {
      notify('Trọng số chưa hợp lệ', `Tổng trọng số hiện tại là ${totalWeight}%. Vui lòng điều chỉnh đúng bằng 100%.`, 'error')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        ratingWeight: Number(form.ratingWeight),
        totalSessionsWeight: Number(form.totalSessionsWeight),
        totalReviewsWeight: Number(form.totalReviewsWeight),
        experienceWeight: Number(form.experienceWeight),
        availabilityWeight: Number(form.availabilityWeight),
        verifiedCertWeight: Number(form.verifiedCertWeight),
        defaultSortBy: form.defaultSortBy,
        featuredMaxCount: Number(form.featuredMaxCount),
        featuredMinRating: Number(form.featuredMinRating),
        featuredMinSessions: Number(form.featuredMinSessions),
        onlyShowExpertsWithAvailableSlots: Boolean(form.onlyShowExpertsWithAvailableSlots),
        prioritizeTodayAvailableSlots: Boolean(form.prioritizeTodayAvailableSlots),
        searchableFields: form.searchableFields,
        featuredSpecializationIds: form.featuredSpecializationIds,
      }

      const updated = await expertSearchConfigService.updateConfig(payload)
      if (updated) {
        setForm((prev) => ({ ...prev, updatedAt: updated.updatedAt }))
      }
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
      const resetData = await expertSearchConfigService.resetToDefault()
      if (resetData) {
        setForm({
          ratingWeight: Number(resetData.ratingWeight ?? 40),
          totalSessionsWeight: Number(resetData.totalSessionsWeight ?? 20),
          totalReviewsWeight: Number(resetData.totalReviewsWeight ?? 10),
          experienceWeight: Number(resetData.experienceWeight ?? 15),
          availabilityWeight: Number(resetData.availabilityWeight ?? 10),
          verifiedCertWeight: Number(resetData.verifiedCertWeight ?? 5),
          defaultSortBy: resetData.defaultSortBy || 'Recommended',
          featuredMaxCount: Number(resetData.featuredMaxCount ?? 6),
          featuredMinRating: Number(resetData.featuredMinRating ?? 4.0),
          featuredMinSessions: Number(resetData.featuredMinSessions ?? 0),
          onlyShowExpertsWithAvailableSlots: Boolean(resetData.onlyShowExpertsWithAvailableSlots),
          prioritizeTodayAvailableSlots: Boolean(resetData.prioritizeTodayAvailableSlots ?? true),
          searchableFields: Array.isArray(resetData.searchableFields)
            ? resetData.searchableFields
            : ['fullName', 'jobTitle', 'companyName', 'specialization', 'bio'],
          featuredSpecializationIds: Array.isArray(resetData.featuredSpecializationIds)
            ? resetData.featuredSpecializationIds
            : [],
          updatedAt: resetData.updatedAt || null,
        })
      }
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
        <CardContent className="py-16 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
          <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium">Đang tải cấu hình đề xuất chuyên gia...</span>
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
              Thiết lập trọng số xếp hạng, tiêu chuẩn chọn chuyên gia nổi bật và phạm vi tìm kiếm trên ứng dụng.
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
                    Trọng số xếp hạng đề xuất
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Tổng tỷ trọng của 6 tiêu chí phải bằng 100%
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
              {/* Thanh phân bổ tỷ trọng tối giản */}
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
            <span>Điểm đề xuất tính trên thang 100 điểm theo tỷ trọng trên.</span>
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
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={form.featuredMaxCount}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        featuredMaxCount: Math.min(20, Math.max(1, Number(e.target.value) || 1)),
                      }))
                    }
                    className="h-9 px-2.5 rounded-md border border-outline-variant/60 bg-surface-container-lowest text-xs font-semibold text-on-surface tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-medium text-on-surface-variant">
                    Số sao tối thiểu
                  </Label>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.5}
                    value={form.featuredMinRating}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        featuredMinRating: Math.min(5, Math.max(0, Number(e.target.value) || 0)),
                      }))
                    }
                    className="h-9 px-2.5 rounded-md border border-outline-variant/60 bg-surface-container-lowest text-xs font-semibold text-on-surface tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <Label className="text-[11px] font-medium text-on-surface-variant">
                    Số ca tối thiểu
                  </Label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={form.featuredMinSessions}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        featuredMinSessions: Math.max(0, Number(e.target.value) || 0),
                      }))
                    }
                    className="h-9 px-2.5 rounded-md border border-outline-variant/60 bg-surface-container-lowest text-xs font-semibold text-on-surface tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                  />
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
