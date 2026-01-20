/**
 * Date utility functions for consistent date handling
 */

/**
 * Get start of day (00:00:00.000)
 * @param {Date} date - Date to process (defaults to now)
 * @returns {Date} Start of day
 */
exports.getStartOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get end of day (23:59:59.999)
 * @param {Date} date - Date to process (defaults to now)
 * @returns {Date} End of day
 */
exports.getEndOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get start of week (Monday 00:00:00.000)
 * @param {Date} date - Date to process (defaults to now)
 * @returns {Date} Start of week (Monday)
 */
exports.getStartOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

/**
 * Normalize date to midnight for consistent referenceDate
 * @param {Date} date - Date to normalize
 * @returns {Date} Normalized date at 00:00:00.000
 */
exports.normalizeDate = (date = new Date()) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};