import React from 'react'

interface DatePresetsProps {
  onSelect: (from: string, to: string) => void
  className?: string
}

const toLocalDate = (d: Date) =>
  d.toLocaleDateString('en-CA') // yields YYYY-MM-DD in local time

const getPresets = () => {
  const now = new Date()
  const today = toLocalDate(now)

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const yesterdayStr = toLocalDate(yesterday)

  // This week: Monday → today
  const thisWeekStart = new Date(now)
  thisWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const thisWeekStartStr = toLocalDate(thisWeekStart)

  // Last week
  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setDate(thisWeekStart.getDate() - 1)
  const lastWeekStart = new Date(lastWeekEnd)
  lastWeekStart.setDate(lastWeekEnd.getDate() - 6)

  // This month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthStartStr = toLocalDate(thisMonthStart)

  // Last month
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  // Last 7 days
  const last7 = new Date(now)
  last7.setDate(now.getDate() - 6)

  // Last 30 days
  const last30 = new Date(now)
  last30.setDate(now.getDate() - 29)

  // Last 3 months
  const last3m = new Date(now)
  last3m.setMonth(now.getMonth() - 3)

  // This year
  const thisYearStart = new Date(now.getFullYear(), 0, 1)

  // Last year
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31)

  return [
    { label: 'Today', from: today, to: today },
    { label: 'Yesterday', from: yesterdayStr, to: yesterdayStr },
    { label: 'Last 7 days', from: toLocalDate(last7), to: today },
    { label: 'This week', from: thisWeekStartStr, to: today },
    { label: 'Last week', from: toLocalDate(lastWeekStart), to: toLocalDate(lastWeekEnd) },
    { label: 'Last 30 days', from: toLocalDate(last30), to: today },
    { label: 'This month', from: thisMonthStartStr, to: today },
    { label: 'Last month', from: toLocalDate(lastMonthStart), to: toLocalDate(lastMonthEnd) },
    { label: 'Last 3 months', from: toLocalDate(last3m), to: today },
    { label: 'This year', from: toLocalDate(thisYearStart), to: today },
    { label: 'Last year', from: toLocalDate(lastYearStart), to: toLocalDate(lastYearEnd) },
  ]
}

const DatePresets: React.FC<DatePresetsProps> = ({ onSelect, className = '' }) => {
  const presets = getPresets()
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {presets.map((p) => (
        <button
          key={p.label}
          type="button"
          onClick={() => onSelect(p.from, p.to)}
          className="px-2.5 py-1 text-xs rounded-full border border-gray-300 bg-white hover:bg-teal-50 hover:border-teal-400 hover:text-teal-700 text-gray-600 transition-colors"
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

export default DatePresets
