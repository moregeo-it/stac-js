import Asset from './asset.js';
import Band from './band.js';
import CatalogLike from './cataloglike.js';
import { isObject } from './utils.js';

/**
 * Extents
 *
 * @typedef {Object} Extent
 * @property {SpatialExtent} spatial Spatial extents
 * @property {TemporalExtent} temporal Temporal extents
 */
/**
 * Spatial Extents
 *
 * @typedef {Object} SpatialExtent
 * @property {Array.<Array<number>>} bbox Bounding boxes
 */
/**
 * Temporal Extents
 *
 * @typedef {Object} TemporalExtent
 * @property {Array.<Array<string|null>>} interval Intervals
 */

/**
 * A STAC Collection.
 *
 * You can access all properties of the given STAC Collection object directly, e.g. `collection.title`.
 *
 * @class
 * @property {string} stac_version
 * @property {?Array.<string>} stac_extensions
 * @property {string} type
 * @property {string} id
 * @property {?string} title
 * @property {string} description
 * @property {?Array.<string>} keywords
 * @property {string} license
 * @property {Array.<Provider>} providers
 * @property {Extent} extent
 * @property {Object.<string, Array|Object>} summaries
 * @property {Array.<Link>} links
 * @property {Object.<string, Asset>} assets
 *
 * @param {Object} data The STAC Collection object
 * @param {string|null} absoluteUrl Absolute URL of the STAC Collection
 */
class Collection extends CatalogLike {
  constructor(data, absoluteUrl = null) {
    const keyMap = {
      assets: Asset.fromAssets,
      item_assets: Asset.fromAssets,
    };
    super(data, absoluteUrl, keyMap);
  }

  /**
   * Returns metadata from the Collection summaries for the given field name.
   *
   * @param {string} field Field name
   * @returns {Array.<*>|Object|undefined} The value of the field
   */
  getSummary(field) {
    if (isObject(this.summaries)) {
      return this.summaries[field];
    }
    return undefined;
  }

  /**
   * Returns the bands.
   *
   * @returns {Array.<Band>}
   */
  getBands() {
    let bands = this.getMetadata('bands');
    if (!Array.isArray(bands)) {
      bands = this.getSummary('bands');
    }
    if (!Array.isArray(bands)) {
      return [];
    }
    return Band.fromBands(bands, this);
  }
}

export default Collection;
