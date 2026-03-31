// ==================== CONSTANTS ====================

const NEPAL_TIMEZONE = 'Asia/Kathmandu';

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

module.exports = {
  NEPAL_TIMEZONE,
  getNepaliCurrentDateTime,
  formatNepaliDateTime,
  convertToNepaliTime,
};
