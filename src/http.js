import { URI } from './utils.js';

/**
 * Protocols supported by browsers (http and https).
 * 
 * @type {Array.<string>}
 */
export const browserProtocols = [
  'http',
  'https'
];

/**
 * 
 * @todo
 * @param {string} href 
 * @param {string} baseUrl 
 * @param {boolean} stringify 
 * @returns {string|URI}
 */
export function toAbsolute(href, baseUrl, stringify = true) {
  return normalizeUri(href, baseUrl, false, stringify);
}

/**
 * 
 * @todo
 * @param {string} href 
 * @param {string|null} baseUrl 
 * @param {boolean} noParams 
 * @param {boolean} stringify 
 * @returns {string|URI}
 */
export function normalizeUri(href, baseUrl = null, noParams = false, stringify = true) {
  // Parse URL and make absolute, if required
  let uri = URI(href);
  if (baseUrl && uri.is("relative")) { // Don't convert GDAL VFS URIs: https://github.com/radiantearth/stac-browser/issues/116
    // Avoid that baseUrls that have a . in the last parth part will be removed (e.g. https://example.com/api/v1.0 )
    let baseUri = URI(baseUrl);
    let baseUriPath = baseUri.path();
    if (!baseUriPath.endsWith('/') && !baseUriPath.endsWith('.json')) {
      baseUri.path(baseUriPath + '/');
    }
    uri = uri.absoluteTo(baseUri);
  }
  // Normalize URL and remove trailing slash from path
  // to avoid handling the same resource twice
  uri.normalize();
  if (noParams) {
    uri.query("");
    uri.fragment("");
  }
  return stringify ? uri.toString() : uri;
}
