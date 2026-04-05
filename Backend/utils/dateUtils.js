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

module.exports = {
  NEPAL_TIMEZONE,
  NEPAL_OFFSET_MINUTES,
  getNepaliCurrentDateTime,
  formatNepaliDateTime,
  convertToNepaliTime,
  getNepaliDayRangeInUTC,
};
