/**
 * All relation types used by STAC for pagination.
 * 
 * @type {Array.<string>}
 */
export const pagination = [
  'first',
  'last',
  'next',
  'prev',
  'previous',
];

/**
 * All relation types used by Queryables in STAC and OGC APIs.
 * 
 * @type {Array.<string>}
 */
export const queryables = [
  'queryables', // Old way in STAC (deprecated)
  'http://www.opengis.net/def/rel/ogc/1.0/queryables', // STAC and OGC APIs
  'ogc-rel:queryables' // Alternative in OGC APIs
];
