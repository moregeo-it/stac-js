import STACReference from './reference.js';
import { isObject } from './utils.js';

/**
 * A STAC Link object.
 *
 * You can access all properties of the given STAC Link object directly, e.g. `link.href`.
 *
 * @class
 * @property {string} href
 * @property {string} rel
 * @property {?string} type
 * @property {?string} title
 * @property {?string} method
 * @property {?Object.<string, string>} headers
 * @property {?Object} body
 * @property {?boolean} merge
 *
 * @param {Object|Link} data The STAC Link object
 * @param {STAC|null} context The object that contains the link
 */
class Link extends STACReference {
  constructor(data, context = null) {
    super(data, context);
  }

  /**
   * Check whether this given object is a STAC LInk.
   *
   * @returns {boolean} `true` if the object is a STAC Link, `false` otherwise.
   */
  isLink() {
    return true;
  }

  /**
   * Returns the type of the STAC object, here: 'Link'.
   *
   * @returns {string}
   */
  getObjectType() {
    return 'Link';
  }

  /**
   * Returns whether the link is a preview image.
   *
   * @returns {boolean} `true` if the link is a preview, `false` otherwise.
   */
  isPreview() {
    return this.rel === 'preview';
  }

  /**
   * Converts an array of STAC Links into an array of stac-js Links.
   *
   * @param {Array.<Object>} links Links
   * @param {STAC|null} context The object that contains the links
   * @returns {Array.<Link>} Improved Links
   */
  static fromLinks(links, context = null) {
    if (!Array.isArray(links)) {
      return [];
    }
    return links.map((link) => (isObject(link) ? new Link(link, context) : link));
  }
}

export default Link;
