/**
 * The GeoJSON media type.
 * 
 * @type {string}
 */
export const geojsonMediaType = 'application/geo+json';

/**
 * All STAC media types (JSON + GeoJSON).
 * 
 * @type {Array.<string>}
 */
export const stacMediaTypes = [
  'application/json',
  geojsonMediaType,
  'text/json'
];

/**
 * The media type for JSON Schemas (e.g. queryables).
 */
export const schemaMediaType = "application/schema+json";

/**
 * All image media types that Web Browsers can show (GIF, JPEG, PNG, WebP).
 * 
 * @type {Array.<string>}
 */
export const browserImageTypes = [
  'image/gif',
  'image/jpeg', // sometimes the invalid 'image/jpg' is used in the wild
  'image/apng',
  'image/png',
  'image/webp',
// To be considered in the future if needed.
// see also https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types
//'image/bmp',
//'image/svg+xml',
//'image/avif',
];

/**
 * All Cloud Optimized GeoTiff media types.
 * 
 * @type {Array.<string>}
 */
export const cogMediaTypes = [
  'image/tiff; application=geotiff; profile=cloud-optimized',
  'image/vnd.stac.geotiff; cloud-optimized=true'
];

/**
 * All web-optimized GeoZARR media types.
 * 
 * @todo There are probably more variants, we may need to parse the media type completely.
 * @type {Array.<string>}
 */
export const wozMediaTypes = [
  // See stac-fields for details
  'application/vnd.zarr; version=2; profile=multiscales',
  'application/vnd.zarr; version=3; profile=multiscales',
  'application/vnd+zarr; version=2; profile=multiscales',
  'application/vnd+zarr; version=3; profile=multiscales',
];

/**
 * All ZARR media types.
 * 
 * @type {Array.<string>}
 */
export const zarrMediaTypes = [
  // See stac-fields for details
  'application/vnd.zarr',
  'application/vnd.zarr; version=2',
  'application/vnd.zarr; version=3',
  'application/vnd+zarr',
  'application/vnd+zarr; version=2',
  'application/vnd+zarr; version=3',
  'application/x-zarr',
].concat(wozMediaTypes);

/**
 * All GeoTiff media types (including COG media types).
 * 
 * @type {Array.<string>}
 */
export const geotiffMediaTypes = [
  'application/geotiff',
  'image/tiff; application=geotiff',
  'image/vnd.stac.geotiff',
].concat(cogMediaTypes);

/**
 * All image media types combined (Web Browser + GeoTiff).
 * 
 * @type {Array.<string>}
 */
export const imageMediaTypes = browserImageTypes.concat(geotiffMediaTypes);

/**
 * Checks whether a given media type is in the list of media types.
 * 
 * @param {string|undefined} type The potential media type.
 * @param {string|Array.<string>} allowedTypes A list of allowed media types (or a single media type as string).
 * @param {boolean} allowUndefined If set to `true`, returns `true` if `undefined` is passed as `type`.
 * @returns {boolean} `true` if the media type is allowed, `false` otherwise.
 */
export function isMediaType(type, allowedTypes, allowUndefined = false) {
  if (!Array.isArray(allowedTypes)) {
    allowedTypes = [allowedTypes];
  }
  if (allowUndefined && typeof type === 'undefined') {
    return true;
  }
  else if (typeof type !== 'string') {
    return false;
  }
  else {
    allowedTypes = allowedTypes.map(type => type.toLowerCase());
    return allowedTypes.includes(type.toLowerCase());
  }
}

/**
 * Checks whether the given media type is a STAC media type (JSON or GeoJSON).
 * 
 * @param {string|undefined} type The potential media type.
 * @param {boolean} allowUndefined If set to `true`, returns `true` if `undefined` is passed as `type`.
 * @returns {boolean} `true` if the media type is a STAC media type, `false` otherwise.
 */
export function isStacMediaType(type, allowUndefined = false) {
  return isMediaType(type, stacMediaTypes, allowUndefined);
}
