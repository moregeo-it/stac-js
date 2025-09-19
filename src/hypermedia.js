import STACObject from './object.js';
import Link from './link.js';
import { isStacMediaType } from './mediatypes.js';
import { hasText, isObject } from './utils.js';
import URI from 'urijs';


/**
 * STAC Hypermedia class for STAC objects.
 * 
 * Don't instantiate this class!
 * 
 * @interface
 * @property {Array.<Link>} links
 * 
 * @param {Object} data The STAC object
 * @param {string|null} absoluteUrl Absolute URL of the STAC object
 * @param {Object.<string, function>} keyMap Keys and functions that convert the values to stac-js objects.
 * @param {Array.<string>} privateKeys Keys that are private members of the stac-js objects (for cloning and export).
 */
class STACHypermedia extends STACObject {

  constructor(data, absoluteUrl = null, keyMap = {}, privateKeys = []) {
    super(
      data,
      Object.assign({ links: Link.fromLinks }, keyMap),
      ['_url'].concat(privateKeys)
    );

    // Set or detect the URL of the STAC entity
    if (!this._url) {
      this._url = absoluteUrl;
      if (!this._url) {
        let self = this.getSelfLink();
        if (self) {
          this._url = self.href;
        }
      }
    }
  }

  /**
   * Gets the absolute URL of the STAC entity (if provided explicitly or available from the self link).
   * 
   * @param {boolean} stringify If `true` (default), a string is returned, otherwise a URI object.
   * @returns {string|null} Absolute URL
   */
  getAbsoluteUrl(stringify = true) {
    return stringify ? this._url : URI(this._url);
  }

  /**
   * Sets the absolute URL of the STAC entity.
   * 
   * @param {string} url Absolute URL
   */
  setAbsoluteUrl(url) {
    this._url = url;
  }

  /**
   * 
   * @todo
   * @param {string} rel 
   * @param {boolean} allowUndefined 
   * @returns {Array.<Link>}
   */
  getStacLinksWithRel(rel, allowUndefined = true) {
    return this.getLinksWithRels([rel])
      .filter(link => isStacMediaType(link.type, allowUndefined));
  }

  /**
   * 
   * @todo
   * @param {string} rel 
   * @param {boolean} allowUndefined 
   * @returns {Link} 
   */
  getStacLinkWithRel(rel, allowUndefined = true) {
    const links = this.getStacLinksWithRel(rel, allowUndefined);
    if (links.length > 0) {
      return links[0];
    }
    else {
      return null;
    }
  }
  
  /**
   * 
   * @todo
   * @returns {Array.<Link>}
   */
  getLinks() {
    return Array.isArray(this.links) ? this.links.filter(link => isObject(link) && hasText(link.href)) : [];
  }

  /**
   * 
   * @todo
   * @param {string} rel 
   * @returns {Link} 
   */
  getLinkWithRel(rel) {
    return this.getLinks().find(link => link.rel === rel) || null;
  }

  /**
   * 
   * @todo
   * @param {Array.<string>} rels 
   * @returns {Array.<Link>} 
   */
  getLinksWithRels(rels) {
    return this.getLinks().filter(link => rels.includes(link.rel));
  }

  /**
   * 
   * @todo
   * @param {Array.<string>} rels 
   * @returns {Array.<Link>} 
   */
  getLinksWithOtherRels(rels) {
    return this.getLinks().filter(link => !rels.includes(link.rel));
  }

  /**
   * Returns the self link, if present.
   * 
   * @returns {Link|null} The self link
   */
  getSelfLink() {
    return this.getStacLinkWithRel('self');
  }

  /**
   * Returns the root link, if present.
   * 
   * @returns {Link|null} The root link
   */
  getRootLink() {
    return this.getStacLinkWithRel('root');
  }

  /**
   * Returns the parent link, if present.
   * 
   * @returns {Link|null} The parent link
   */
  getParentLink() {
    return this.getStacLinkWithRel('parent');
  }
  
}

export default STACHypermedia;
