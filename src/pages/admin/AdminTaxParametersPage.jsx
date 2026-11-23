import { useState, useEffect, useRef } from 'react'
import {
  taxPolicyService,
  bracketsApiToJson,
  bracketsJsonToPayload,
  bracketsAppliesFromYear,
  effectiveBrackets,
  deductionsToForm,
  deductionsFormToPayload,
  validateDeductionsForm,
} from '@/services/taxPolicyService'
import { BracketsEditor } from '@/components/admin/tax-parameters/BracketsEditor'
import { groupThousands, formatPercent, parseDayList, validateBrackets } from '@/utils/taxConfigMeta'

// Năm chọn xem: tính quanh năm hiện tại, BE tự chọn bản ghi hiệu lực cho năm đó
const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR + 1 - i)

const inputCls =
  'w-full h-9 px-3 rounded-lg border border-outline-variant/40 text-sm bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary'
const btnPrimary =
  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
const btnGhost =
  'flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-outline-variant/40 text-xs font-bold text-on-surface hover:bg-surface-container-low cursor-pointer'

const money = (v) => (v == null ? '—' : `${groupThousands(String(Math.round(Number(v))))} ₫`)

function Section({ icon, title, source, editing, onEdit, onCancel, onSave, saving, children }) {
  return (
    <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-xs overflow-hidden">
      <div className="px-space-lg py-space-md border-b border-surface-container-high flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary text-[22px]">{icon}</span>
          <div className="flex flex-col min-w-0">
            <h3 className="text-title-sm font-bold text-on-surface">{title}</h3>
            {source && <span className="text-[11px] text-on-surface-variant">{source}</span>}
          </div>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <button type="button" onClick={onCancel} className={btnGhost}>Hủy</button>
            <button type="button" onClick={onSave} disabled={saving} className={btnPrimary}>
              <span className="material-symbols-outlined text-[16px]">save</span>
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        ) : (
          onEdit && (
            <button type="button" onClick={onEdit} className={btnGhost}>
              <span className="material-symbols-outlined text-[16px]">edit</span>
              Chỉnh sửa
            </button>
          )
        )}
      </div>
      <div className="p-space-lg">{children}</div>
    </section>
  )
}

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">{label}</span>
      {children}
    </div>
  )
}

const DEDUCTION_FIELDS = [
  { key: 'personalMonthly', label: 'Giảm trừ bản thân (₫/tháng)', kind: 'money' },
  { key: 'dependentMonthly', label: 'Giảm trừ người phụ thuộc (₫/người/tháng)', kind: 'money' },
  { key: 'bhxhRate', label: 'Tỷ lệ BHXH (%)', kind: 'rate' },
  { key: 'bhytRate', label: 'Tỷ lệ BHYT (%)', kind: 'rate' },
  { key: 'bhtnRate', label: 'Tỷ lệ BHTN (%)', kind: 'rate' },
  { key: 'smallAmountExemption', label: 'Ngưỡng miễn nộp bù (₫)', kind: 'money' },
]

export function AdminTaxParametersPage() {
  const [taxYear, setTaxYear] = useState(CURRENT_YEAR)
  const [isLoading, setIsLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const [loadErrors, setLoadErrors] = useState([])
  const [reloadTick, setReloadTick] = useState(0)

  const [policy, setPolicy] = useState(null)
  const [brackets, setBrackets] = useState([])
  const [schedule, setSchedule] = useState(null)

  const [editing, setEditing] = useState(null) // 'deductions' | 'brackets' | 'schedule'
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const requestRef = useRef(0)
  const toastTimer = useRef(null)

  const showToast = (type, message) => {
    clearTimeout(toastTimer.current)
    setToast({ type, message })
    toastTimer.current = setTimeout(() => setToast(null), 4000)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    const requestId = ++requestRef.current
    const load = async () => {
      setIsLoading(true)
      const [p, b, s] = await Promise.allSettled([
        taxPolicyService.getDeductions(taxYear),
        taxPolicyService.getBrackets(taxYear),
        taxPolicyService.getSchedule(taxYear),
      ])
      if (requestId !== requestRef.current) return
      const failed = [p, b, s].filter((r) => r.status === 'rejected')
      setForbidden(failed.some((r) => r.reason?.status === 403))
      setLoadErrors([...new Set(failed.map((r) => r.reason?.message || 'Không tải được dữ liệu.'))])
      setPolicy(p.status === 'fulfilled' ? p.value : null)
      setBrackets(b.status === 'fulfilled' ? effectiveBrackets(b.value) : [])
      setSchedule(s.status === 'fulfilled' ? s.value : null)
      setIsLoading(false)
    }
    load()
  }, [taxYear, reloadTick])

  const startEdit = (section) => {
    setEditing(section)
    if (section === 'deductions') setDraft(deductionsToForm(policy))
    if (section === 'brackets') setDraft(bracketsApiToJson(brackets))
    if (section === 'schedule')
      setDraft({
        deadlineMonth: String(schedule?.deadlineMonth ?? ''),
        deadlineDay: String(schedule?.deadlineDay ?? ''),
        reminderDays: (schedule?.reminderDays ?? []).join(', '),
      })
  }
  const cancelEdit = () => {
    setEditing(null)
    setDraft(null)
  }

  const save = async () => {
    let error = ''
    let call
    if (editing === 'deductions') {
      error = validateDeductionsForm(draft)
      call = () => taxPolicyService.updateDeductions(deductionsFormToPayload(draft, taxYear))
    } else if (editing === 'brackets') {
      error = validateBrackets(draft)
      // BE chỉ cập nhật/thêm bậc theo số bậc, không xóa bậc thừa → giảm số bậc sẽ để lại bậc cũ trong cách tính
      if (!error && bracketYear === taxYear && JSON.parse(draft).length < brackets.length) {
        error = `Chưa hỗ trợ giảm số bậc của biểu thuế năm ${taxYear} (hệ thống sẽ giữ lại bậc cũ). Hãy giữ đủ ${brackets.length} bậc.`
      }
      call = () => taxPolicyService.updateBrackets(bracketsJsonToPayload(draft, taxYear))
    } else if (editing === 'schedule') {
      const days = parseDayList(draft.reminderDays)
      const m = Number(draft.deadlineMonth)
      const d = Number(draft.deadlineDay)
      if (!Number.isInteger(m) || m < 1 || m > 12) error = 'Tháng hạn chót phải từ 1 đến 12.'
      else if (!Number.isInteger(d) || d < 1 || d > 31) error = 'Ngày hạn chót phải từ 1 đến 31.'
      else if (!days) error = 'Mốc nhắc hạn là các số ngày dương, cách nhau bằng dấu phẩy.'
      call = () =>
        taxPolicyService.updateSchedule({
          taxYear: schedule?.taxYear ?? null,
          deadlineMonth: m,
          deadlineDay: d,
          reminderDays: days,
          description: schedule?.description || null,
        })
    }
    if (error) {
      showToast('error', error)
      return
    }
    try {
      setSaving(true)
      const res = await call()
      showToast('success', res?.message || 'Đã lưu cấu hình.')
      cancelEdit()
      setReloadTick((t) => t + 1)
    } catch (err) {
      showToast('error', err?.message || 'Không lưu được cấu hình.')
    } finally {
      setSaving(false)
    }
  }

  const policyYear = policy?.appliesFromYear ?? null
  const bracketYear = bracketsAppliesFromYear(brackets)
  const newVersionNote = (fromYear) =>
    fromYear != null && fromYear !== taxYear
      ? ` Lưu sẽ tạo bản áp dụng từ năm ${taxYear}; bản năm ${fromYear} giữ nguyên.`
      : ''

  return (
    <div className="p-space-xl flex flex-col gap-space-lg max-w-6xl">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[60] px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <span className="font-label-sm uppercase tracking-wider text-secondary font-bold">THAM SỐ TÍNH THUẾ TNCN</span>
          <h1 className="text-headline-lg font-bold text-on-surface tracking-tight">Tham số thuế TNCN</h1>
          <p className="text-on-surface-variant text-sm max-w-2xl">
            Giảm trừ gia cảnh, tỷ lệ bảo hiểm, biểu thuế và hạn quyết toán mà hệ thống đang dùng để tính quyết toán và nhắc hạn.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-on-surface shrink-0">
          Năm tính thuế
          <select
            value={taxYear}
            onChange={(e) => {
              cancelEdit()
              setTaxYear(Number(e.target.value))
            }}
            className="h-9 px-3 rounded-lg border border-outline-variant/40 text-xs font-semibold bg-surface-container-low cursor-pointer"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      </div>

      {forbidden ? (
        <div className="py-20 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 flex flex-col items-center gap-2 text-on-surface-variant">
          <span className="material-symbols-outlined text-[44px] text-on-surface-variant/40">lock</span>
          <h4 className="text-title-sm font-bold text-on-surface">Bạn không có quyền quản lý tham số quyết toán</h4>
          <p className="text-xs">Cần quyền settlement.policy_manage và settlement.schedule_manage.</p>
        </div>
      ) : isLoading ? (
        <div className="py-16 text-center text-sm text-on-surface-variant">Đang tải tham số thuế năm {taxYear}...</div>
      ) : (
        <>
          {loadErrors.length > 0 && (
            <div className="p-3 rounded-xl bg-error-container/20 border border-error/30 text-error text-xs">
              {loadErrors.join(' ')}
            </div>
          )}

          <Section
            icon="family_restroom"
            title="Giảm trừ gia cảnh & bảo hiểm bắt buộc"
            source={
              policy
                ? `Đang áp dụng cho năm ${taxYear}: ${policy.lawName || 'chính sách'} (từ năm ${policyYear}).${editing === 'deductions' ? newVersionNote(policyYear) : ''}`
                : 'Chưa có chính sách giảm trừ trong hệ thống.'
            }
            editing={editing === 'deductions'}
            onEdit={editing ? null : () => startEdit('deductions')}
            onCancel={cancelEdit}
            onSave={save}
            saving={saving}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-md">
              {DEDUCTION_FIELDS.map((f) => (
                <Field key={f.key} label={f.label}>
                  {editing === 'deductions' ? (
                    <input
                      inputMode={f.kind === 'money' ? 'numeric' : 'decimal'}
                      value={draft?.[f.key] ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                      className={inputCls}
                    />
                  ) : (
                    <span className="text-base font-extrabold text-on-surface tabular-nums">
                      {policy?.[f.key] == null ? '—' : f.kind === 'money' ? money(policy[f.key]) : formatPercent(Number(policy[f.key]))}
                    </span>
                  )}
                </Field>
              ))}
              <Field label="Trần giảm trừ y tế (₫/năm)">
                <span className="text-base font-extrabold text-on-surface tabular-nums">{money(policy?.medicalMaxYearly)}</span>
              </Field>
              <Field label="Trần giảm trừ giáo dục (₫/năm)">
                <span className="text-base font-extrabold text-on-surface tabular-nums">{money(policy?.educationMaxYearly)}</span>
              </Field>
            </div>
            {editing === 'deductions' && (
              <p className="mt-3 text-[11px] text-on-surface-variant">
                Trần y tế và giáo dục chưa sửa được ở đây vì API cập nhật của BE không nhận hai trường này.
              </p>
            )}
          </Section>

          <Section
            icon="stacked_bar_chart"
            title="Biểu thuế lũy tiến từng phần"
            source={
              brackets.length
                ? `${brackets.length} bậc, áp dụng từ năm ${bracketYear}.${editing === 'brackets' ? newVersionNote(bracketYear) : ''}`
                : 'Chưa có biểu thuế trong hệ thống.'
            }
            editing={editing === 'brackets'}
            onEdit={editing ? null : () => startEdit('brackets')}
            onCancel={cancelEdit}
            onSave={save}
            saving={saving}
          >
            {editing === 'brackets' ? (
              <BracketsEditor value={draft} onChange={setDraft} />
            ) : (
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant border-b border-surface-container-high">
                    <th className="py-2 px-2 text-center w-12">Bậc</th>
                    <th className="py-2 px-2 text-left">Thu nhập tính thuế / tháng</th>
                    <th className="py-2 px-2 text-right">Thuế suất</th>
                    <th className="py-2 px-2 text-right">Số trừ nhanh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high/40">
                  {JSON.parse(bracketsApiToJson(brackets)).map((b) => (
                    <tr key={b.bracketNo}>
                      <td className="py-2 px-2 text-center font-mono font-bold">{b.bracketNo}</td>
                      <td className="py-2 px-2 tabular-nums">
                        {b.toMonthly == null ? `Trên ${money(b.fromMonthly)}` : `${money(b.fromMonthly)} – ${money(b.toMonthly)}`}
                      </td>
                      <td className="py-2 px-2 text-right font-bold tabular-nums">{formatPercent(b.rate)}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{money(b.quickDeduct)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>

          <Section
            icon="event"
            title="Hạn quyết toán & mốc nhắc hạn"
            source={schedule?.description || (schedule ? null : 'Chưa có lịch quyết toán trong hệ thống.')}
            editing={editing === 'schedule'}
            onEdit={editing || !schedule ? null : () => startEdit('schedule')}
            onCancel={cancelEdit}
            onSave={save}
            saving={saving}
          >
            {editing === 'schedule' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                <Field label="Tháng hạn chót">
                  <input inputMode="numeric" value={draft.deadlineMonth} onChange={(e) => setDraft((d) => ({ ...d, deadlineMonth: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Ngày hạn chót">
                  <input inputMode="numeric" value={draft.deadlineDay} onChange={(e) => setDraft((d) => ({ ...d, deadlineDay: e.target.value }))} className={inputCls} />
                </Field>
                <Field label="Nhắc trước hạn (ngày, cách nhau dấu phẩy)">
                  <input value={draft.reminderDays} onChange={(e) => setDraft((d) => ({ ...d, reminderDays: e.target.value }))} className={inputCls} />
                </Field>
              </div>
            ) : (
              schedule && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
                  <Field label="Hạn chót">
                    <span className="text-base font-extrabold text-on-surface">
                      Ngày {schedule.deadlineDay}/{schedule.deadlineMonth}
                    </span>
                  </Field>
                  <Field label="Nhắc trước hạn">
                    <span className="text-base font-extrabold text-on-surface">{(schedule.reminderDays || []).join(', ')} ngày</span>
                  </Field>
                  <Field label="Áp dụng">
                    <span className="text-base font-extrabold text-on-surface">
                      {schedule.taxYear ? `Năm ${schedule.taxYear}` : 'Mọi năm'}
                    </span>
                  </Field>
                </div>
              )
            )}
          </Section>
        </>
      )}
    </div>
  )
}
