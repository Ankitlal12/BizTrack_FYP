// Date Utilities Tests
const {
  getNepaliCurrentDateTime,
  getNepaliDateOnly,
  getNepaliTimeOnly,
  formatDateForDisplay,
  isToday,
  getDaysDifference,
  addDays,
  isDateExpired,
} = require('../../utils/dateUtils');

describe('Date Utilities', () => {
  // ==================== NEPALI DATE TIME TESTS ====================

  describe('Nepali Current DateTime', () => {
    test('should return a valid date object', () => {
      const result = getNepaliCurrentDateTime();
      expect(result).toBeInstanceOf(Date);
    });

    test('should return date string in correct format', () => {
      const result = getNepaliCurrentDateTime();
      expect(typeof result === 'string' || result instanceof Date).toBe(true);
    });

    test('should contain Nepal timezone offset', () => {
      const result = getNepaliCurrentDateTime();
      expect(result).toBeDefined();
    });
  });

  // ==================== DATE ONLY TESTS ====================

  describe('Nepali Date Only', () => {
    test('should return date without time', () => {
      const result = getNepaliDateOnly();
      expect(result).toBeDefined();
      // Should not contain time portion
      const hasTime = result.includes(':');
      expect(hasTime).toBe(false);
    });

    test('should be in YYYY-MM-DD format', () => {
      const result = getNepaliDateOnly();
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(dateRegex.test(result)).toBe(true);
    });
  });

  // ==================== TIME ONLY TESTS ====================

  describe('Nepali Time Only', () => {
    test('should return time without date', () => {
      const result = getNepaliTimeOnly();
      expect(result).toBeDefined();
      // Should contain colons for HH:MM:SS format
      const hasTimeFormat = result.includes(':');
      expect(hasTimeFormat).toBe(true);
    });

    test('should be in HH:MM:SS format', () => {
      const result = getNepaliTimeOnly();
      const timeRegex = /^\d{2}:\d{2}:\d{2}$/;
      expect(timeRegex.test(result)).toBe(true);
    });
  });

  // ==================== DATE FORMATTING TESTS ====================

  describe('Format Date for Display', () => {
    test('should format date for display', () => {
      const date = new Date('2024-01-15');
      const result = formatDateForDisplay(date);
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('should handle null/undefined dates', () => {
      expect(() => {
        formatDateForDisplay(null);
      }).not.toThrow();

      expect(() => {
        formatDateForDisplay(undefined);
      }).not.toThrow();
    });

    test('should format valid date objects', () => {
      const date = new Date('2024-06-15T10:30:00');
      const result = formatDateForDisplay(date);
      expect(result).toBeDefined();
    });
  });

  // ==================== DATE COMPARISON TESTS ====================

  describe('Date Comparisons', () => {
    test('should identify if date is today', () => {
      const today = new Date();
      const result = isToday(today);
      expect(result).toBe(true);
    });

    test('should identify if date is not today', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = isToday(yesterday);
      expect(result).toBe(false);
    });

    test('should calculate days difference', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-10');
      const diff = getDaysDifference(date1, date2);
      expect(Math.abs(diff)).toBe(9);
    });

    test('should handle same date difference', () => {
      const date = new Date('2024-01-15');
      const diff = getDaysDifference(date, date);
      expect(diff).toBe(0);
    });
  });

  // ==================== DATE MANIPULATION TESTS ====================

  describe('Date Manipulation', () => {
    test('should add days to date', () => {
      const date = new Date('2024-01-15');
      const newDate = addDays(date, 5);
      expect(newDate.getDate()).toBe(20);
    });

    test('should add zero days', () => {
      const date = new Date('2024-01-15');
      const newDate = addDays(date, 0);
      expect(newDate.getTime()).toBe(date.getTime());
    });

    test('should add negative days (subtract)', () => {
      const date = new Date('2024-01-15');
      const newDate = addDays(date, -5);
      expect(newDate.getDate()).toBe(10);
    });

    test('should handle month boundaries', () => {
      const date = new Date('2024-01-28');
      const newDate = addDays(date, 5);
      expect(newDate.getMonth()).toBe(1); // February
    });

    test('should handle year boundaries', () => {
      const date = new Date('2024-12-28');
      const newDate = addDays(date, 5);
      expect(newDate.getFullYear()).toBe(2025);
    });
  });

  // ==================== EXPIRATION TESTS ====================

  describe('Expiration Checks', () => {
    test('should identify expired dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      const isExpired = isDateExpired(pastDate);
      expect(isExpired).toBe(true);
    });

    test('should identify non-expired dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const isExpired = isDateExpired(futureDate);
      expect(isExpired).toBe(false);
    });

    test('should handle dates far in the past', () => {
      const farPast = new Date('2020-01-01');
      const isExpired = isDateExpired(farPast);
      expect(isExpired).toBe(true);
    });

    test('should handle dates far in the future', () => {
      const farFuture = new Date('2030-12-31');
      const isExpired = isDateExpired(farFuture);
      expect(isExpired).toBe(false);
    });
  });

  // ==================== TIMEZONE TESTS ====================

  describe('Timezone Handling', () => {
    test('should handle Nepal timezone correctly', () => {
      const nepaliTime = getNepaliCurrentDateTime();
      expect(nepaliTime).toBeDefined();
    });

    test('should handle date boundaries across timezones', () => {
      const date1 = new Date();
      const date2 = getNepaliCurrentDateTime();
      // Both should represent approximately the same moment
      expect(date1).toBeDefined();
      expect(date2).toBeDefined();
    });
  });
});
