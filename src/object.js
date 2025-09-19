import { centerOfBoundingBox } from './geo.js';
import { isObject } from './utils.js';

/**
 * Base class for STAC objects.
 * 
 * Don't instantiate this class!
 * 
 * @interface
 * @param {Object} data The STAC object
 * @param {Object.<string, function>} keyMap Keys and functions that convert the values to stac-js objects.
 * @param {Array.<string>} privateKeys Keys that are private members of the stac-js objects (for cloning and export).
 */
class STACObject {

  constructor(data, keyMap = {}, privateKeys = []) {
    if (!isObject(data)) {
      throw new Error('Given data is not an object');
    }

    if (data instanceof STACObject) {
      for(let key of privateKeys) {
        this[key] = data[key];
      }
      data = data.toJSON();
    }

    // Map with functions that convert properties to stac-js objects
    this._keyMap = keyMap;
    // Array with keys that are used internally and should be cloned
    this._privateKeys = ['_keyMap', '_privateKeys'].concat(privateKeys);

    // Assign the data to the object
    for (let key in data) {
      if (typeof this[key] === 'undefined') {
        if (key in keyMap) {
          this[key] = keyMap[key](data[key], this);
        }
        else {
          this[key] = data[key];
        }
      }
    }
  }

  /**
   * Check whether this given object is a STAC Item.
   * 
   * @returns {boolean} `true` if the object is a STAC Item, `false` otherwise.
   */
  isItem() {
    return this.type === 'Feature';
  }

  /**
   * Check whether this given object is a STAC Catalog.
   * 
   * @returns {boolean} `true` if the object is a STAC Catalog, `false` otherwise.
   */
  isCatalog() {
    return this.type === 'Catalog';
  }

  /**
   * Check whether this given object is "catalog-like", i.e. a Catalog or Collection.
   * 
   * @returns {boolean} `true` if the object is a "catalog-like", `false` otherwise.
   */
  isCatalogLike() {
    return this.isCatalog() || this.isCollection();
  }

  /**
   * Check whether this given object is a STAC Collection.
   * 
   * @returns {boolean} `true` if the object is a STAC Collection, `false` otherwise.
   */
  isCollection() {
    return this.type === 'Collection';
  }

  /**
   * Check whether this given object is a STAC ItemCollection.
   * 
   * @returns {boolean} `true` if the object is a STAC ItemCollection, `false` otherwise.
   */
  isItemCollection() {
    return this.type === 'FeatureCollection';
  }

  /**
   * Check whether this given object is a STAC Collection of Collections (i.e. API Collections).
   * 
   * @returns {boolean} `true` if the object is a STAC CollectionCollection, `false` otherwise.
   */
  isCollectionCollection() {
    return false;
  }

  /**
   * Check whether this given object is a STAC Asset.
   * 
   * @returns {boolean} `true` if the object is a STAC Asset, `false` otherwise.
   */
  isAsset() {
    return false;
  }

  /**
   * Check whether this given object is a STAC Link.
   * 
   * @returns {boolean} `true` if the object is a STAC Link, `false` otherwise.
   */
  isLink() {
    return false;
  }

  /**
   * Check whether this given object is a STAC Band.
   * 
   * @returns {boolean} `true` if the object is a STAC Band, `false` otherwise.
   */
  isBand() {
    return false;
  }

  /**
   * Returns the type of the STAC object.
   * 
   * One of:
   * - Asset
   * - Catalog
   * - Collection
   * - CollectionCollection
   * - Item
   * - ItemCollection
   * - Link
   * - Band
   * @abstract
   * @returns {string}
   */
  getObjectType() {
    return;
  }

  /**
   * Gets the absolute URL of the STAC entity (if provided explicitly or available from the self link).
   * 
   * @param {boolean} stringify If `true` (default), a string is returned, otherwise a URI object.
   * @returns {string|null} Absolute URL
   */
  getAbsoluteUrl(stringify = true) { // eslint-disable-line no-unused-vars
    return null;
  }

  /**
   * Returns the metadata for the STAC entity.
   * 
   * @param {string} field Field name
   * @returns {*}
   */
  getMetadata(field) {
    return this[field];
  }

  /**
   * Returns a GeoJSON Feature or FeatureCollection for this STAC object.
   * 
   * @returns {Object|null} GeoJSON object or `null`
   */
  toGeoJSON() {
    return null;
  }

  /**
   * Returns a single bounding box for the STAC entity.
   * 
   * @returns {BoundingBox|null}
   */
  getBoundingBox() {
    return null;
  }

  /**
   * Returns the center of the STAC entity.
   * 
   * @returns {BoundingBox|null}
   */
  getCenter() {
    return centerOfBoundingBox(this.getBoundingBox());
  }

  /**
   * Returns a list of bounding boxes for the STAC entity.
   * 
   * @returns {Array.<BoundingBox>}
   */
  getBoundingBoxes() {
    return [];
  }

  /**
   * Returns a plain object for JSON export.
   * 
   * @returns {Object} Plain object
   */
  toJSON() {
    let obj = {};
    Object.keys(this).forEach(key => {
      if (typeof this[key] === 'function' || this._privateKeys.includes(key)) {
        return;
      }
      let v = this[key];
      if (key in this._keyMap) {
        let v2 = Array.isArray(v) ? [] : {};
        for(let key in v) {
          if (typeof v[key].toJSON === 'function') {
            v2[key] = v[key].toJSON();
          }
          else {
            v2[key] = v[key];
          }
        }
        v = v2;
      }
      obj[key] = v;
    });
    return obj;
  }
  
}

export default STACObject;
