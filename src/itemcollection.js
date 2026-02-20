import { unionDateTime } from './datetime.js';
import { unionBoundingBox } from './geo.js';
import { isObject } from './utils.js';
import Item from './item.js';
import APICollection from './apicollection.js';

/**
 * Represents an ItemCollection containing Items.
 * 
 * @class
 * @property {string} type
 * @property {Array.<Item>} features
 * @property {Array.<Link>} links
 * 
 * @param {Object} data The STAC Item Collection object
 * @param {string|null} absoluteUrl Absolute URL of the STAC Item Collection
 */
class ItemCollection extends APICollection {

  /**
   * Returns whether the given data looks like a STAC ItemCollection response.
   * 
   * @param {*} data 
   * @returns {boolean}
   */
  static isResponse(data) {
    return isObject(data) && data.type === 'FeatureCollection' && Array.isArray(data.features);
  }

  constructor(data, absoluteUrl = null) {
    const keyMap = {
      features: features => features.map(
        feature => feature instanceof Item ? feature : new Item(feature)
      )
    };
    super(data, absoluteUrl, keyMap);
  }

  /**
   * Returns the type of the STAC object, here: 'ItemCollection'.
   * 
   * @returns {string}
   */
  getObjectType() {
    return "ItemCollection";
  }

  /**
   * Returns all items.
   * 
   * @returns {Array.<Item>} All STAC Items
   */
  getAll() {
    return this.features;
  }

  /**
   * Returns a GeoJSON FeatureCollection for this STAC object.
   * 
   * @returns {Object|null} GeoJSON object or `null`
   */
  toGeoJSON() {
    return this.toJSON();
  }

  /**
   * Returns a single 2D bounding box for all the STAC items.
   * 
   * @returns {BoundingBox|null}
   */
  getBoundingBox() {
    return unionBoundingBox(this.getBoundingBoxes());
  }

  /**
   * Returns a list of 2D bounding boxes for all the STAC items.
   * 
   * @returns {Array.<BoundingBox>}
   */
  getBoundingBoxes() {
    return this.features.map(item => item.getBoundingBox());
  }

  /**
   * Returns a single temporal extent for all the STAC items.
   * 
   * @returns {Array.<Date|null>|null}
   */
  getTemporalExtent() {
    return unionDateTime(this.getTemporalExtents());
  }

  /**
   * Returns the temporal extent(s) for all the STAC items.
   * 
   * @returns {Array.<Array.<Date|null>>}
   */
  getTemporalExtents() {
    return this.features.map(item => item.getTemporalExtent());
  }

}

export default ItemCollection;
