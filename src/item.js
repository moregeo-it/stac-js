import Asset from './asset.js';
import { centerDateTime, isoToDate } from './datetime.js';
import { ensureBoundingBox } from './geo.js';
import { hasText } from './utils.js';
import STAC from './stac.js';
import Band from './band.js';

/**
 * Metadata for an item, the item properties.
 *
 * @typedef {Object} ItemProperties
 * @property {string} datetime Date and Time
 */

/**
 * A STAC Item.
 *
 * You can access all properties of the given STAC Item object directly, e.g. `item.id` or `item.properties.datetime`.
 *
 * @class
 * @property {string} stac_version
 * @property {?Array.<string>} stac_extensions
 * @property {string} type
 * @property {string} id
 * @property {Object|null} geometry
 * @property {?Array.<number>} bbox
 * @property {ItemProperties} properties
 * @property {Array.<Link>} links
 * @property {Object.<string, Asset>} assets
 * @property {?string} collection
 *
 * @param {Object} data The STAC Item object
 * @param {string|null} absoluteUrl Absolute URL of the STAC Item
 */
class Item extends STAC {
  constructor(data, absoluteUrl = null) {
    super(data, absoluteUrl, { assets: Asset.fromAssets });
  }

  /**
   * Returns the type of the STAC object, here: 'Item'.
   *
   * @returns {string}
   */
  getObjectType() {
    return 'Item';
  }

  /**
   * Returns a GeoJSON Feature for this STAC object.
   *
   * @returns {Object|null} GeoJSON object or `null`
   */
  toGeoJSON() {
    return this.toJSON();
  }

  /**
   * Returns a single 2D bounding box for the item.
   *
   * @returns {BoundingBox|null}
   */
  getBoundingBox() {
    return ensureBoundingBox(this.bbox);
  }

  /**
   * Returns 2D bounding boxes for the item.
   *
   * @returns {Array.<BoundingBox>}
   */
  getBoundingBoxes() {
    const bbox = this.getBoundingBox();
    return bbox ? [bbox] : [];
  }

  /**
   * Returns a datetime for the STAC Item.
   *
   * If no datetime but start or end datetime are specified, computes a datetime from them.
   *
   * @returns {Date|null}
   */
  getDateTime() {
    let dt = isoToDate(this.properties.datetime);
    if (!dt) {
      let start = isoToDate(this.properties.start_datetime);
      let end = isoToDate(this.properties.end_datetime);
      if (start && end) {
        return centerDateTime(start, end);
      } else {
        return start || end;
      }
    }
    return dt;
  }

  /**
   * Returns a single temporal extent for the STAC Item.
   *
   * @returns {Array.<Date|null>|null}
   */
  getTemporalExtent() {
    return this.getTemporalExtents()[0] || null;
  }

  /**
   * Returns the temporal extent(s) for the STAC Item.
   *
   * @returns {Array.<Array.<Date|null>>}
   */
  getTemporalExtents() {
    let dates = [];
    if (hasText(this.properties.start_datetime) || hasText(this.properties.end_datetime)) {
      dates = [[this.properties.start_datetime || null, this.properties.end_datetime || null]];
    } else if (hasText(this.properties.datetime)) {
      dates = [[this.properties.datetime, this.properties.datetime]];
    }
    return dates.map((interval) => interval.map((datetime) => isoToDate(datetime)));
  }

  /**
   * Returns metadata from the Item properties for the given field name.
   *
   * @param {string} field Field name
   * @returns {*} The value of the field
   */
  getMetadata(field) {
    return this.properties[field];
  }

  /**
   * Returns the bands.
   *
   * @todo Merge bands from assets
   * @returns {Array.<Band>}
   */
  getBands() {
    const bands = this.getMetadata('bands');
    if (Array.isArray(bands)) {
      return Band.fromBands(bands, this);
    } else {
      return [];
    }
  }

  /**
   * Returns the collection link, if present.
   *
   * @returns {Link|null} The collection link
   */
  getCollectionLink() {
    return this.getStacLinkWithRel('collection');
  }
}

export default Item;
