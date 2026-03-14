import { URI } from './utils.js';

/**
 * Protocols supported by browsers (http and https).
 *
 * @type {Array.<string>}
 */
export const browserProtocols = ['http', 'https'];

/**
 * Converts a relative URL to an absolute URL based on the given base URL.
 *
 * @param {string} href The URL to convert.
 * @param {string} baseUrl The base URL to resolve against.
 * @param {boolean} stringify If `true` (default), returns a string, otherwise a URI object.
 * @returns {string|URI} The absolute URL.
 */
export function toAbsolute(href, baseUrl, stringify = true) {
  return normalizeUri(href, baseUrl, false, stringify);
}

/**
 * Normalizes a URI by resolving it against an optional base URL and removing trailing slashes.
 * Optionally strips query parameters and fragments.
 *
 * @param {string} href The URL to normalize.
 * @param {string|null} baseUrl The base URL to resolve against, or `null` to skip resolution.
 * @param {boolean} noParams If `true`, removes query parameters and fragments.
 * @param {boolean} stringify If `true` (default), returns a string, otherwise a URI object.
 * @returns {string|URI} The normalized URL.
 */
export function normalizeUri(href, baseUrl = null, noParams = false, stringify = true) {
  // Parse URL and make absolute, if required
  let uri = URI(href);
  if (baseUrl && uri.is('relative')) {
    uri = uri.absoluteTo(baseUrl);
  }
  // Normalize URL and remove trailing slash from path
  // to avoid handling the same resource twice
  uri.normalize();
  if (noParams) {
    uri.query('');
    uri.fragment('');
  }
  return stringify ? uri.toString() : uri;
}
