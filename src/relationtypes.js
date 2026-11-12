/**
 * Hierarchical relation types used by STAC.
 *
 * `catalogs` is part of the Multi-Tenant Catalogs extension and links to the recursive
 * (sub-)catalog registry of a catalog, which can be nested to arbitrary depth.
 * `children` is part of the API Children extension and links to the child catalogs and
 * collections of a catalog.
 */
export const hierarchical = ['catalogs', 'child', 'children', 'collection', 'item', 'parent', 'root', 'self'];

/**
 * All relation types used by STAC for pagination.
 *
 * @type {Array.<string>}
 */
export const pagination = ['first', 'last', 'next', 'prev', 'previous'];

/**
 * All relation types used by Queryables in STAC and OGC APIs.
 *
 * @type {Array.<string>}
 */
export const queryables = [
  'queryables', // Old way in STAC (deprecated)
  'http://www.opengis.net/def/rel/ogc/1.0/queryables', // STAC and OGC APIs
  'ogc-rel:queryables', // Alternative in OGC APIs
];

/**
 * All relation types used by Sortables in STAC and OGC APIs.
 *
 * @type {Array.<string>}
 */
export const sortables = [
  'http://www.opengis.net/def/rel/ogc/1.0/sortables', // STAC and OGC APIs
  'ogc-rel:sortables', // Alternative in OGC APIs
];
