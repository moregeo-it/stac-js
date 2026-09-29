import { URI, isObject } from './utils.js';

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
 * Gets the URL of the `self` link of the given STAC data and resolves it against the given base URL.
 *
 * Use this for STAC entities that are embedded in another document, e.g. the Items in an ItemCollection.
 * Relative URLs in their links must be resolved against the URL of the embedding document.
 *
 * @param {Object} data The STAC data (plain object).
 * @param {string|null} baseUrl The URL of the document that contains the data, or `null` if unknown.
 * @returns {string|null} The URL of the self link, absolute if a base URL is given, or `null` if there's no self link.
 */
export function resolveSelfUrl(data, baseUrl = null) {
  if (!isObject(data) || !Array.isArray(data.links)) {
    return null;
  }
  const self = data.links.find((link) => isObject(link) && link.rel === 'self' && typeof link.href === 'string');
  if (!self) {
    return null;
  }
  return toAbsolute(self.href, baseUrl);
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
