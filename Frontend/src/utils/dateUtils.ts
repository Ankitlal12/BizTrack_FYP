/**
 * Utility functions for handling Nepali timezone (Asia/Kathmandu)
 * Nepal Standard Time (NPT) is UTC+5:45
 */

export const NEPAL_TIMEZONE = 'Asia/Kathmandu'

/**
 * Format date to Nepali timezone
 * @param date - Date string or Date object
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in Nepali timezone
 */
export const formatNepaliDateTime = (
  date: string | Date,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: NEPAL_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }

  const formatOptions = { ...defaultOptions, ...options }
  
  return new Intl.DateTimeFormat('en-US', formatOptions).format(dateObj)
}

/**
 * Format date to Nepali timezone (date only)
 * @param date - Date string or Date object
 * @returns Formatted date string in Nepali timezone
 */
export const formatNepaliDate = (date: string | Date): string => {
  return formatNepaliDateTime(date, {
    timeZone: NEPAL_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format time to Nepali timezone (time only)
 * @param date - Date string or Date object
 * @returns Formatted time string in Nepali timezone
 */
export const formatNepaliTime = (date: string | Date): string => {
  return formatNepaliDateTime(date, {
    timeZone: NEPAL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

/**
 * Get current date/time in Nepali timezone
 * @returns Current date in Nepali timezone
 */
export const getNepaliCurrentDateTime = (): string => {
  return formatNepaliDateTime(new Date())
}

/**
 * Convert date to Nepali timezone for display
 * @param date - Date string or Date object
 * @returns Object with formatted date, time, and full datetime
 */
export const getNepaliDateTimeComponents = (date: string | Date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
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