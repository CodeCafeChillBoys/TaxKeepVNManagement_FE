import { ConfigType, getConfigMeta, formatValue, parseDayList } from '@/utils/taxConfigMeta'

export function TaxParamValueDisplay({ configKey, value }) {
  const meta = getConfigMeta(configKey)
  const result = formatValue(meta.type, value)

  if (!result.valid) {
    return (
      <div className="flex flex-col gap-1 min-w-0">
        <span className="inline-flex w-fit items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-error-container/40 text-error border border-error/30">
          <span className="material-symbols-outlined text-[13px]">error</span>
          Sai định dạng
        </span>
        <span className="font-mono text-[11px] text-on-surface-variant truncate max-w-[260px]" title={String(value ?? '')}>
          {String(value ?? '') || '(trống)'}
        </span>
      </div>
    )
  }

  if (meta.type === ConfigType.MONEY) {
    return (
      <span className="text-sm font-extrabold text-on-surface">
        {result.text}
        {meta.unit && <span className="ml-1 text-[11px] font-medium text-on-surface-variant">{meta.unit}</span>}
      </span>
    )
  }

  if (meta.type === ConfigType.RATE) {
    const pct = Math.min(100, Math.max(0, Number(value) * 100))
    return (
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-extrabold text-primary min-w-[36px]">{result.text}</span>
        <div className="w-20 bg-surface-container-highest h-2 rounded-full overflow-hidden shrink-0">
          <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-[11px] text-on-surface-variant">({String(value).trim()})</span>
      </div>
    )
  }

  if (meta.type === ConfigType.DAY_LIST) {
    return (
      <div className="flex flex-wrap items-center gap-1 max-w-[280px]">
        {parseDayList(value).map((d, i) => (
          <span
            key={`${d}-${i}`}
            className="inline-flex px-1.5 py-0.5 rounded-md text-[10.5px] bg-amber-500/10 text-amber-800 border border-amber-500/20 font-medium"
          >
            {d}
          </span>
        ))}
        <span className="text-[11px] text-on-surface-variant">ngày trước hạn</span>
      </div>
    )
  }

  if (meta.type === ConfigType.BRACKETS) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary">
        <span className="material-symbols-outlined text-[16px]">stacked_bar_chart</span>
        {result.text}
      </span>
    )
  }

  if (meta.type === ConfigType.TEXT) {
    return (
      <span className="font-mono text-xs text-on-surface break-all" title={String(value ?? '')}>
        {result.text}
      </span>
    )
  }

  // MONTH, DAY, YEAR
  return <span className="text-sm font-extrabold text-on-surface">{result.text}</span>
}
