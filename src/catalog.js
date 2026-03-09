import CatalogLike from './cataloglike.js';

/**
 * A STAC Catalog.
 *
 * You can access all properties of the given STAC Catalog object directly, e.g. `catalog.title`.
 *
 * @class
 * @property {string} stac_version
 * @property {?Array.<string>} stac_extensions
 * @property {string} type
 * @property {string} id
 * @property {?string} title
 * @property {string} description
 * @property {Array.<Link>} links
 *
 * @param {Object} data The STAC Catalog object
 * @param {string|null} absoluteUrl Absolute URL of the STAC Catalog
 */
class Catalog extends CatalogLike {
  constructor(data, absoluteUrl = null) {
    super(data, absoluteUrl);
  }
}

export default Catalog;
