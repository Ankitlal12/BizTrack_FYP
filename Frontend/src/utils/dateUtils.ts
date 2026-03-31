// ==================== CONSTANTS ====================

export const NEPAL_TIMEZONE = 'Asia/Kathmandu'

// ==================== HELPERS ====================

/**
 * Safely parse a date value.
 * Date-only strings like "2026-04-01" are parsed as LOCAL noon (not UTC midnight)
 * to avoid the UTC+5:45 offset showing as "05:45:00 AM".
 */
const parseDateSafe = (date: string | Date): Date => {
  if (date instanceof Date) return date
  // Detect date-only format: YYYY-MM-DD (no time component)
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Parse as local date at noon to avoid timezone offset artifacts
    const [year, month, day] = date.split('-').map(Number)
    return new Date(year, month - 1, day, 12, 0, 0)
  }
  return new Date(date)
}

// ==================== FORMATTERS ====================

/**
 * Format a date to a full Nepali timezone datetime string.
 * Pass custom Intl options to override defaults.
 * Date-only strings (YYYY-MM-DD) are treated as local noon to avoid
 * the UTC+5:45 offset artifact showing as "05:45:00 AM".
 */
export const formatNepaliDateTime = (
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = parseDateSafe(date)
  const defaults: Intl.DateTimeFormatOptions = {
    timeZone: NEPAL_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }
  return new Intl.DateTimeFormat('en-US', { ...defaults, ...options }).format(dateObj)
}

/** Format a date to date-only string in Nepali timezone */
export const formatNepaliDate = (date: string | Date): string =>
  formatNepaliDateTime(parseDateSafe(date), { timeZone: NEPAL_TIMEZONE, year: 'numeric', month: 'short', day: 'numeric' })

/** Format a date to time-only string in Nepali timezone */
export const formatNepaliTime = (date: string | Date): string =>
  formatNepaliDateTime(parseDateSafe(date), { timeZone: NEPAL_TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })

/** Get current datetime formatted in Nepali timezone */
export const getNepaliCurrentDateTime = (): string => formatNepaliDateTime(new Date())

// ==================== COMPONENTS ====================

/**
 * Break a date into its individual formatted parts (date, time, full, short).
 */
export const getNepaliDateTimeComponents = (date: string | Date) => {
  const dateObj = parseDateSafe(date)
  return {
    date: formatNepaliDate(dateObj),
    time: formatNepaliTime(dateObj),
    fullDateTime: formatNepaliDateTime(dateObj),
    shortDateTime: formatNepaliDateTime(dateObj, {
      timeZone: NEPAL_TIMEZONE,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  }
}
