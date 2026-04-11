/**
 * Shared utility functions for date manipulation.
 * @module utils
 */

/** @type {Object<string, number>} Month abbreviation to zero-based index. */
const MONTH_MAP = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3,
    'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7,
    'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
};

/** @type {string[]} Month abbreviations indexed by month number. */
const MONTH_NAMES = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Formats a Date to ISO date string (YYYY-MM-DD).
 * @param {Date} date - Date object to format.
 * @returns {string} ISO date string.
 */
export function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Parses "Apr 11, 2026" into a Date object.
 * @param {string} str - Human-readable date string.
 * @returns {Date|null} Parsed date or null.
 */
export function parseShortDate(str) {
    const match = str.match(/(\w{3})\s+(\d{1,2}),\s+(\d{4})/);
    if (!match) return null;
    const month = MONTH_MAP[match[1]];
    if (month === undefined) return null;
    return new Date(parseInt(match[3]), month, parseInt(match[2]));
}

/**
 * Adds days to a date, returning a new Date.
 * @param {Date} date - Starting date.
 * @param {number} days - Days to add (can be negative).
 * @returns {Date} New date.
 */
export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Returns three-letter month abbreviation.
 * @param {number} index - Zero-based month index.
 * @returns {string} Month abbreviation.
 */
export function getMonthName(index) {
    return MONTH_NAMES[index];
}

/**
 * Returns the Sunday on or before the given date.
 * @param {Date} date - Reference date.
 * @returns {Date} Start-of-week Sunday.
 */
export function getWeekStart(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
}

/**
 * Formats an ISO date string for display in tooltips.
 * @param {string} isoDate - ISO date (YYYY-MM-DD).
 * @returns {string} Formatted string like "April 11, 2026".
 */
export function formatDateForDisplay(isoDate) {
    const date = new Date(isoDate + 'T00:00:00');
    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}
