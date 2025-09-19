import { getMinMaxValues, getNoDataValues, hasText, isObject } from "./utils.js";
import STACReference from './reference.js';
import Band from "./band.js";

const NO_INHERITANCE = [
  'created',
  'updated',
  'published',
  'expires',
  'unpublished',
  'bands'
];

/**
 * A STAC Asset or Item Asset Definition.
 * 
 * You can access all properties of the given STAC Asset object directly, e.g., `asset.href`.
 * 
 * @class
 * @property {string} href
 * @property {?string} title
 * @property {?string} description
 * @property {?string} type
 * @property {?Array.<string>} roles
 * 
 * @param {Object|Asset} data The STAC Asset object
 * @param {string} key The asset key
 * @param {Collection|Item|null} context The object that contains the asset
 */
class Asset extends STACReference {

  constructor(data, key = null, context = null) {
    const keyMap = {
      bands: Band.fromBands,
      alternate: Asset.fromAssets
    };
    super(data, context, keyMap, ['_key']);
    if (!this._key) {
      this._key = key;
    }
  }

  /**
   * Returns the type of the STAC object, here: 'Asset'.
   * 
   * @returns {string}
   */
  getObjectType() {
    return "Asset";
  }

  /**
   * Check whether this given object is a STAC Asset.
   * 
   * @returns {boolean} `true` if the object is a STAC Asset, `false` otherwise.
   */
  isAsset() {
    return true;
  }

  /**
   * Gets the URL of the asset as absolute URL.
   * 
   * @param {boolean} stringify If `true` (default), a string is returned, otherwise a URI object.
   * @returns {URI|string|null}
   */
  getAbsoluteUrl(stringify = true) {
    if (this.isDefinition()) {
      return null;
    }
    return super.getAbsoluteUrl(stringify);
  }

  /**
   * Returns the key of the asset.
   * 
   * @returns {string|null} Key of the asset
   */
  getKey() {
    return this._key;
  }

  /**
   * Returns the metadata for the given field name.
   * 
   * Returns the metadata from the asset, if present.
   * Otherwise, returns the metadata from calling `getMetadata()` on the STAC entity that contains the asset.
   * 
   * @param {string} field Field name
   * @returns {*} The value of the field
   */
  getMetadata(field) {
    if (typeof this[field] !== 'undefined') {
      return this[field];
    }
    // Check whether this is an alternate asset
    if (this._context instanceof Asset) {
      return this._context.getMetadata(field);
    }
    // This should be a Collection or Item, we can inherit most fields
    if (this._context && !NO_INHERITANCE.includes(field)) {
      return this._context.getMetadata(field);
    }
    return undefined;
  }

  /**
   * Returns the bands for the asset.
   * 
   * @returns {Array.<Band>}
   */
  getBands() {
    return this.bands || [];
  }

  /**
   * The RGB bands.
   * 
   * @typedef {Object} VisualBands
   * @property {Band} red The red band with its index
   * @property {Band} green The green band with its index
   * @property {Band} blue The blue band with its index
   */

  /**
   * Find the RGB bands.
   * 
   * @returns {VisualBands|null} Object with the RGB bands or null
   */
  findVisualBands() {
    const rgb = {
      red: null,
      green: null,
      blue: null
    };
    const bands = this.getBands();
    for(const key in bands) {
      const index = parseInt(key, 10); // for loop may return strings as keys
      const band = bands[index];
      if (isObject(band) && hasText(band['eo:common_name']) && band['eo:common_name'] in rgb) {
        rgb[band['eo:common_name']] = band;
      }
    }
    const complete = Object.values(rgb).every(o => o !== null);
    return complete ? rgb : null;
  }

  /**
   * Returns the band for the given criteria.
   * 
   * Searches the given `property` (default: `name`) for the given value(s).
   * 
   * @param {*} value A single value to find or a list of values to find one of.
   * @param {string} property The property in the bands to match against.
   * @returns {Band|null}
   * @see {getBands}
   */
  findBand(value, property = 'name') {
    if (!Array.isArray(value)) {
      value = [value];
    }
    const bands = this.getBands();
    const index = bands.findIndex(band => isObject(band) && value.includes(band[property]));
    if (index >= 0) {
      return bands[index];
    }
    return null;
  }

  /**
   * Returns the band for the given band index.
   * 
   * Passes through the (band) objects.
   * 
   * @param {number|Object} band
   * @returns {Object|null}
   * @see {getBands}
   */
  getBand(band) {
    if (isObject(band) || band === null) {
      return band;
    }
    const bands = this.getBands();
    return bands[band] || null;
  }

  /**
   * Gets the reported minimum and maximum values for an asset.
   * 
   * Searches through different extension fields in raster, classification, and file.
   * 
   * @returns {Statistics}
   */
  getMinMaxValues() {
    return getMinMaxValues(this);
  }

  /**
   * Gets the reported no-data values for an asset.
   * 
   * Searches through different extension fields in nodata, classification, and file.
   * 
   * @returns {Array.<*>}
   */
  getNoDataValues() {
    return getNoDataValues(this);
  }

  /**
   * Returns whether this asset is an Item Asset definition (i.e., doesn't have an href) or not.
   * 
   * @returns {boolean} `true` if this asset is an Item Asset definition, `false` otherwise.
   */
  isDefinition() { // 
    return !hasText(this.href);
  }

  /**
   * Checks whether the asset is accessible via HTTP or HTTPS.
   * 
   * Returns `null` for item asset definitions, otherwise a `boolean` value.
   * 
   * @returns {boolean|null} `true` if this asset is available via HTTP or HTTPS, `false` or `null` otherwise.
   */
  isHTTP() {
    if (this.isDefinition()) {
      return null;
    }
    return super.isHTTP();
  }

  /**
   * Returns whether the asset is a preview image (thumbnail / overview).
   * 
   * An asset is a preview if one of the roles is 'thumbnail' or 'overview'.
   * it is also a preview if the key is 'thumbnail' or 'overview'.
   * 
   * @returns {boolean} `true` if the asset is a preview, `false` otherwise.
   */
  isPreview() {
    const roles = ['thumbnail', 'overview'];
    if (roles.includes(this.getKey())) {
      return true;
    }
    return Array.isArray(this.roles) && this.roles.some(role => roles.includes(role));
  }

  /**
   * Checks whether this asset has a specific role assigned.
   * 
   * @param {string|Array.<string>} roles One or more roles.
   * @param {boolean} includeKey Also returns `true` if the asset key equals to one of the given roles.
   * @returns {boolean} `true` if this asset is one of the given roles (or key), `false` otherwise.
   */
  hasRole(roles, includeKey = false) { // string or array of strings
    if (!Array.isArray(roles)) {
      roles = [roles];
    }
    if (includeKey && roles.includes(this.getKey())) {
      return true;
    }
    return Array.isArray(this.roles) && (Boolean(this.roles.find(role => roles.includes(role))));
  }

  /**
   * Converts an object of STAC Assets into an object of stac-js Assets.
   * 
   * @param {Object.<string, Object>} assets Assets
   * @param {Collection|Item|null} context The object that contains the assets
   * @returns {Object.<string, Asset>} Improved Assets
   */
  static fromAssets(assets, context = null) {
    let newAssets = {};
    if(isObject(assets)) {
      for(let i in assets) {
        const a = assets[i];
        const newAsset = a instanceof Asset ? a : new Asset(a, i, context);
        newAssets[i] = newAsset;
      }
    }
    return newAssets;
  }

}

export default Asset;
