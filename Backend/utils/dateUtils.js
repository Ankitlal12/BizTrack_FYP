/**
 * Utility functions for handling Nepali timezone (Asia/Kathmandu)
 * Nepal Standard Time (NPT) is UTC+5:45
 */

const NEPAL_TIMEZONE = 'Asia/Kathmandu';

/**
 * Get current date/time in Nepali timezone
 * @returns {Date} Current date adjusted for Nepali timezone
 */
const getNepaliCurrentDateTime = () => {
  const now = new Date();
  // Convert to Nepali timezone (UTC+5:45)
  const nepaliTime = new Date(now.toLocaleString("en-US", { timeZone: NEPAL_TIMEZONE }));
  return nepaliTime;
};

/**
 * Format date to Nepali timezone string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string in Nepali timezone
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
    hour12: true
  });
};

/**
 * Convert UTC date to Nepali timezone
 * @param {Date|string} utcDate - UTC date
 * @returns {Date} Date adjusted for Nepali timezone
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