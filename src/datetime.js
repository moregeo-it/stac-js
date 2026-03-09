import { hasText } from './utils.js';

/**
 * Parses a UTC-based ISO8601 date and time string to a Date object.
 *
 * Does not support timezones as all STAC datetime must be given in UTC.
 *
 * @returns {Date|null}
 */
export function isoToDate(str) {
  if (hasText(str) && str.length >= 10) {
    try {
      let strParts = str.match(/^(-?\d{1,})-(\d\d)-(\d\d)[T ](\d\d):(\d\d):(\d\d)(?:\.(\d*))?(?:Z|[+-]00:00)?$/i);
      let dt = strParts.slice(1).map((n) => parseInt(n, 10));
      return new Date(Date.UTC(dt[0], dt[1] - 1, dt[2], dt[3], dt[4], dt[5], dt[6] || 0));
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Computes the center datetime between two datetimes.
 *
 * @param {Date} start start datetime
 * @param {Date} end end datetime
 * @returns {Date} center datetime
 */
export function centerDateTime(start, end) {
  return new Date(start.valueOf() + (end - start) / 2);
}

/**
 * Computes a single interval from multiple temporal intervals.
 *
 * @param {Array.<Array.<Date>>} list A list of temporal intervals
 * @returns {Array.<Date>|null} The merged temporal interval
 */
export function unionDateTime(list) {
  if (!Array.isArray(list) || list.length === 0) {
    return null;
  }

  let min;
  let max;
  const assign = (base, value, fn) => {
    if (typeof base === 'undefined') {
      return value;
    } else if (base === null || value === null) {
      return null;
    } else {
      return fn(base, value);
    }
  };
  list.forEach(([start, end]) => {
    min = assign(min, start, Math.min);
    max = assign(max, end, Math.max);
  });
  return [min === null ? null : new Date(min), max === null ? null : new Date(max)];
}
