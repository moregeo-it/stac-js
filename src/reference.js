import { browserProtocols, toAbsolute } from './http.js';
import { isMediaType } from "./mediatypes.js";
import { hasText, URI } from './utils.js';
import STACObject from './object.js';
import { browserImageTypes } from './mediatypes.js';

/**
 * A STAC reference as base for Assets and Links.
 * 
 * Don't instantiate this class!
 * 
 * @interface
 * @property {string} href
 * @property {?string} type
 * 
 * @param {Object} data The STAC API Collection object
 * @param {STAC|null} context The object that contains the reference
 * @param {Object.<string, function>} keyMap Keys and functions that convert the values to stac-js objects.
 * @param {Array.<string>} privateKeys Keys that are private members of the stac-js objects (for cloning and export).
 */
class STACReference extends STACObject {

  constructor(data, context = null, keyMap = {}, privateKeys = []) {
    super(data, keyMap, ['_context'].concat(privateKeys));
    if (!this._context) {
      this._context = context;
    }
  }

  /**
   * Gets the URL of the reference as absolute URL.
   * 
   * @param {boolean} stringify If `true` (default), a string is returned, otherwise a URI object.
   * @returns {URI|string|null}
   */
  getAbsoluteUrl(stringify = true) {
    if (this._context) {
      return toAbsolute(this.href, this._context.getAbsoluteUrl(), stringify);
    }
    else if (this.href.includes('://')) {
      return stringify ? this.href : URI(this.href);
    }
    return null;
  }

  /**
   * Returns the STAC entity that contains the reference.
   * 
   * @returns {STAC|null}
   */
  getContext() {
    return this._context;
  }

  /**
   * Checks whether a given reference can be displayed by a browser.
   * 
   * A browser can usually display an image if it is a specific file format (e.g. JPEG, PNG, ...) and is served over HTTP(S).
   * 
   * @returns {boolean} `true` if a browser can display the given reference, `false` otherwise.
   * @see {canBrowserDisplayImage}
   */
  canBrowserDisplayImage(allowUndefined = false) {
    if (typeof this.href !== 'string') {
      return false;
    }
    else if (!allowUndefined && typeof this.type === 'undefined') {
      return false;
    }
    let uri = this.getAbsoluteUrl(false);
    if (!uri) {
      uri = URI(this.href);
    }
    const protocol = uri.protocol().toLowerCase();
    const extension = uri.suffix().toLowerCase();
    if (hasText(protocol) && !browserProtocols.includes(protocol)) {
      return false;
    }
    else if (hasText(this.type) && browserImageTypes.includes(this.type.toLowerCase())) {
      return true;
    }
    else if (typeof this.type === 'undefined' && hasText(extension) && (extension === 'jpg' || browserImageTypes.includes('image/' + extension))) {
      return true;
    }
    else {
      return false;
    }
  }

  /**
   * Checks whether this entity is of a specific type.
   * 
   * @param {string|Array.<string>} types One or more media types.
   * @returns {boolean} `true` is this entity is one of the given types, `false` otherwise.
   */
  isType(types) { // string or array of strings
    return hasText(this.type) && isMediaType(this.type, types);
  }

  /**
   * Checks whether the entity is accessible via HTTP or HTTPS.
   * 
   * Returns `null` if no URI is available, otherwise a `boolean` value.
   * 
   * @returns {boolean|null} `true` is this entity is available via HTTP or HTTPS, `false` or `null` otherwise.
   */
  isHTTP() {
    let uri = this.getAbsoluteUrl(false);
    if (!uri) {
      return null;
    }
    const protocol = uri.protocol().toLowerCase();
    return hasText(protocol) && browserProtocols.includes(protocol);
  }

  /**
   * Returns whether the entity is a preview image.
   * 
   * @returns {boolean} `true` if the entity is a preview, `false` otherwise.
   */
  isPreview() {
    return false;
  }
  
}

export default STACReference;
