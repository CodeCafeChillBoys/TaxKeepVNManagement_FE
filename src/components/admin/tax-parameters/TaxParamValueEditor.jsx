import { useState } from 'react'
import { BracketsEditor } from './BracketsEditor'
import {
  ConfigType,
  parseDayList,
  groupThousands,
  rateToPercentInput,
  percentInputToRate,
} from '@/utils/taxConfigMeta'

const baseCls =
  'w-full h-10 px-3 rounded-lg border bg-surface-container-low text-xs font-mono focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary'

const inputCls = (hasError) =>
  `${baseCls} ${hasError ? 'border-error focus:border-error' : 'border-outline-variant/40 focus:border-primary'}`

function MoneyInput({ value, onChange, hasError }) {
  return (
    <div className="relative">
      <input
        inputMode="numeric"
        value={groupThousands(value)}
        placeholder="Ví dụ: 15.500.000"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className={`${inputCls(hasError)} pr-8`}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">₫</span>
    </div>
  )
}

function RateInput({ value, onChange, hasError }) {
  // Giữ chuỗi người dùng đang gõ ("1." không bị nuốt dấu chấm); nạp từ value một lần.
  const [text, setText] = useState(() => rateToPercentInput(value))
  return (
    <div className="relative">
      <input
        inputMode="decimal"
        value={text}
        placeholder="Ví dụ: 8"
        onChange={(e) => {
          setText(e.target.value)
          onChange(percentInputToRate(e.target.value))
        }}
        className={`${inputCls(hasError)} pr-8`}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">%</span>
    </div>
  )
}

function NumberInput({ value, onChange, hasError, min, max, placeholder }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls(hasError)}
    />
  )
}

function DayListInput({ value, onChange, hasError }) {
  const [draft, setDraft] = useState('')
  const days = parseDayList(value) ?? []

  const commit = () => {
    const t = draft.trim()
    if (/^\d+$/.test(t) && Number(t) > 0) onChange([...days, Number(t)].join(','))
    setDraft('')
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 min-h-10 px-2 py-1.5 rounded-lg border bg-surface-container-low focus-within:bg-surface-container-lowest focus-within:ring-1 focus-within:ring-primary ${
        hasError ? 'border-error' : 'border-outline-variant/40 focus-within:border-primary'
      }`}
    >
      {days.map((d, i) => (
        <span
          key={`${d}-${i}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-amber-500/10 text-amber-800 border border-amber-500/20 font-medium"
        >
          {d} ngày
          <button
            type="button"
            title="Bỏ mốc này"
            onClick={() => onChange(days.filter((_, j) => j !== i).join(','))}
            className="cursor-pointer hover:text-error"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
          </button>
        </span>
      ))}
      <input
        inputMode="numeric"
        value={draft}
        placeholder={days.length === 0 ? 'Gõ số ngày rồi nhấn Enter (ví dụ 30)' : 'Thêm mốc…'}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Backspace' && draft === '' && days.length > 0) {
            onChange(days.slice(0, -1).join(','))
          }
        }}
        onBlur={commit}
        className="flex-1 min-w-[140px] h-7 bg-transparent text-xs font-mono focus:outline-none"
      />
    </div>
  )
}

export function TaxParamValueEditor({ type, value, onChange, hasError = false }) {
  switch (type) {
    case ConfigType.MONEY:
      return <MoneyInput value={value} onChange={onChange} hasError={hasError} />
    case ConfigType.RATE:
      return <RateInput value={value} onChange={onChange} hasError={hasError} />
    case ConfigType.MONTH:
      return <NumberInput value={value} onChange={onChange} hasError={hasError} min={1} max={12} placeholder="1–12" />
    case ConfigType.DAY:
      return <NumberInput value={value} onChange={onChange} hasError={hasError} min={1} max={31} placeholder="1–31" />
    case ConfigType.YEAR:
      return <NumberInput value={value} onChange={onChange} hasError={hasError} min={1900} max={2200} placeholder="Ví dụ: 2026" />
    case ConfigType.DAY_LIST:
      return <DayListInput value={value} onChange={onChange} hasError={hasError} />
    case ConfigType.BRACKETS:
      return <BracketsEditor value={value} onChange={onChange} />
    default:
      return (
        <textarea
          rows={3}
          value={value}
          placeholder="Nhập giá trị..."
          onChange={(e) => onChange(e.target.value)}
          className={`w-full p-3 rounded-lg border text-xs font-mono bg-surface-container-low focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary resize-none ${
            hasError ? 'border-error' : 'border-outline-variant/40 focus:border-primary'
          }`}
        />
      )
  }
}
