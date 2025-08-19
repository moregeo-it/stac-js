import { getMinMaxValues, getNoDataValues } from "./utils.js";
import STACObject from './object.js';

/**
 * A STAC Band.
 * 
 * You can access all properties of the given STAC Band object directly, e.g., `band.name`.
 * 
 * @class
 * @property {string} name
 * 
 * @param {Object|Band} data The STAC Band object
 * @param {number|string} index The band index
 * @param {Collection|Item|Asset|null} context The object that contains the band
 */
class Band extends STACObject {

  constructor(data, index = null, context = null) {
    super(data, {}, ['_index', '_context']);
    if (typeof this._index !== 'number') {
      this._index = typeof index === 'string' ? parseInt(index, 10) : index;
    }
    if (!this._context) {
      this._context = context;
    }
  }

  /**
   * Returns the STAC entity that contains the band.
   * 
   * @returns {Collection|Item|Asset|null}
   */
  getContext() {
    return this._context;
  }

  /**
   * Returns the type of the STAC object, here: 'Band'.
   * 
   * @returns {string}
   */
  getObjectType() {
    return "Band";
  }

  /**
   * Check whether this given object is a STAC Band.
   * 
   * @returns {boolean} `true` if the object is a STAC Band, `false` otherwise.
   */
  isBand() {
    return true;
  }

  /**
   * Returns the index of the band.
   * 
   * @returns {number|null} Index of the band
   */
  getIndex() {
    return this._index;
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
    if (this._context) {
      return this._context.getMetadata(field);
    }
    return undefined;
  }

  /**
   * Gets the reported minimum and maximum values for a band.
   * 
   * Searches through different extension fields in raster, classification, and file.
   * 
   * @returns {Statistics}
   */
  getMinMaxValues() {
    return getMinMaxValues(this);
  }

  /**
   * Gets the reported no-data values for a band.
   * 
   * Searches through different extension fields in raster, classification, and file.
   * 
   * @returns {Array.<*>}
   */
  getNoDataValues() {
    return getNoDataValues(this);
  }

  /**
   * Converts an object of STAC Bands into an array of stac-js Bands.
   * 
   * @param {Array.<Object>} bands Bands
   * @param {Collection|Item|Asset|null} context The object that contains the bands
   * @returns {Array.<Band>} Improved Bands
   */
  static fromBands(bands, context = null) {
    let newBands = [];
    if(Array.isArray(bands)) {
      for(let i in bands) {
        const b = bands[i];
        const newBand = b instanceof Band ? b : new Band(b, i, context);
        newBands.push(newBand);
      }
    }
    return newBands;
  }

}

export default Band;
