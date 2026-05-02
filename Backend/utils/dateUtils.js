// ==================== CONSTANTS ====================

const NEPAL_TIMEZONE = 'Asia/Kathmandu';
const NEPAL_OFFSET_MINUTES = 5 * 60 + 45;

// ==================== DATE UTILITIES ====================

/**
 * Get current date/time in Nepali timezone (UTC+5:45)
 * @returns {Date}
 */
const getNepaliCurrentDateTime = () => {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: NEPAL_TIMEZONE }));
};

/**
 * Format a date to a readable Nepali timezone string
 * @param {Date|string} date
 * @returns {string}
 */
const formatNepaliDateTime = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString("en-US", {
    timeZone: NEPAL_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

/**
 * Convert a UTC date to Nepali timezone
 * @param {Date|string} utcDate
 * @returns {Date}
 */
const convertToNepaliTime = (utcDate) => {
  const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
  return new Date(date.toLocaleString("en-US", { timeZone: NEPAL_TIMEZONE }));
};

/**
 * Convert a local Nepal calendar day (YYYY-MM-DD) into UTC range.
 * @param {string} dateString
 * @returns {{start: Date, end: Date}|null}
 */
const getNepaliDayRangeInUTC = (dateString) => {
  if (!dateString || typeof dateString !== 'string') return null;

  const dayPart = dateString.split('T')[0];
  const [year, month, day] = dayPart.split('-').map(Number);

  if (!year || !month || !day) return null;

  const offsetMs = NEPAL_OFFSET_MINUTES * 60 * 1000;
  const startUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs;
  const endUtcMs = Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs;

  return {
    start: new Date(startUtcMs),
    end: new Date(endUtcMs),
  };
};

/**
 * Check if a date is expired (in the past)
 * @param {Date|string} date
 * @returns {boolean}
 */
const isDateExpired = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
};

/**
 * Check if a date is today
 * @param {Date|string} date
 * @returns {boolean}
 */
const isToday = (date) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
};

/**
 * Calculate difference in days between two dates
 * @param {Date|string} date1
 * @param {Date|string} date2
 * @returns {number}
 */
const getDaysDifference = (date1, date2) => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  const diffMs = d2 - d1;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Add days to a date
 * @param {Date|string} date
 * @param {number} days
 * @returns {Date}
 */
const addDays = (date, days) => {
  const dateObj = typeof date === 'string' ? new Date(date) : new Date(date);
  dateObj.setDate(dateObj.getDate() + days);
  return dateObj;
};

/**
 * Get Nepali date only (YYYY-MM-DD format)
 * @returns {string}
 */
const getNepaliDateOnly = () => {
  const now = getNepaliCurrentDateTime();
  return now.toISOString().split('T')[0];
};

/**
 * Get Nepali time only (HH:MM:SS format)
 * @returns {string}
 */
const getNepaliTimeOnly = () => {
  const now = getNepaliCurrentDateTime();
  return now.toLocaleString("en-US", {
    timeZone: NEPAL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

/**
 * Format date for display with a more user-friendly format
 * @param {Date|string|null|undefined} date
 * @returns {string}
 */
const formatDateForDisplay = (date) => {
  if (!date) {
    return 'N/A';
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  return dateObj.toLocaleDateString("en-US", {
    timeZone: NEPAL_TIMEZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

module.exports = {
  NEPAL_TIMEZONE,
  NEPAL_OFFSET_MINUTES,
  getNepaliCurrentDateTime,
  formatNepaliDateTime,
  convertToNepaliTime,
  getNepaliDayRangeInUTC,
  isDateExpired,
  isToday,
  getDaysDifference,
  addDays,
  getNepaliDateOnly,
  getNepaliTimeOnly,
  formatDateForDisplay,
};
