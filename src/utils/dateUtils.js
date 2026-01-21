// src/utils/dateUtils.js

/**
 * Resolves date range for API queries
 * @param {string} startDate - Start date string (optional)
 * @param {string} endDate - End date string (optional)
 * @returns {Object} Object containing start and end Date objects
 */
exports.resolveDateRange = (startDate, endDate) => {
  let start;
  let end;

  if (startDate && endDate) {
    // Custom date range
    start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
  } else {
    // Default → TODAY
    start = new Date();
    start.setHours(0, 0, 0, 0);
    end = new Date(); // now
  }

  return { start, end };
};