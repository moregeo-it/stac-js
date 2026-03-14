import STACObject from './object.js';
import Link from './link.js';
import { isMediaType, isStacMediaType, schemaMediaType } from './mediatypes.js';
import { hasText, isObject, URI } from './utils.js';

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
    super(data, Object.assign({ links: Link.fromLinks }, keyMap), ['_url'].concat(privateKeys));

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
   * Returns all links with the given relation type that have a STAC media type.
   *
   * @param {string} rel The relation type to filter by.
   * @param {boolean} allowUndefined If `true` (default), links without a media type are included.
   * @returns {Array.<Link>} The matching links with a STAC media type.
   */
  getStacLinksWithRel(rel, allowUndefined = true) {
    return this.getLinksWithRels([rel]).filter((link) => isStacMediaType(link.type, allowUndefined));
  }

  /**
   * Returns the first link with the given relation type that has a STAC media type.
   *
   * @param {string} rel The relation type to filter by.
   * @param {boolean} allowUndefined If `true` (default), links without a media type are included.
   * @returns {Link|null} The first matching link, or `null` if none found.
   */
  getStacLinkWithRel(rel, allowUndefined = true) {
    const links = this.getStacLinksWithRel(rel, allowUndefined);
    if (links.length > 0) {
      return links[0];
    } else {
      return null;
    }
  }

  /**
   * Returns the first link with the given relation type that has a JSON Schema media type.
   *
   * @param {*} rels The relation types to filter by.
   * @return {Link|null} The first matching link, or `null` if none found.
   */
  getSchemaLinkWithRels(rels) {
    const links = this.getLinksWithRels(rels).filter((link) => isMediaType(link.type, schemaMediaType, true));
    return links[0] || null;
  }

  /**
   * Returns all valid links, filtering out entries that are not objects or lack an `href` property.
   *
   * @returns {Array.<Link>} An array of valid links.
   */
  getLinks() {
    return Array.isArray(this.links) ? this.links.filter((link) => isObject(link) && hasText(link.href)) : [];
  }

  /**
   * Returns the first link with the given relation type.
   *
   * @param {string} rel The relation type to search for.
   * @returns {Link|null} The first matching link, or `null` if none found.
   */
  getLinkWithRel(rel) {
    return this.getLinks().find((link) => link.rel === rel) || null;
  }

  /**
   * Returns all links whose relation type is included in the given list.
   *
   * @param {Array.<string>} rels The relation types to filter by.
   * @returns {Array.<Link>} The matching links.
   */
  getLinksWithRels(rels) {
    return this.getLinks().filter((link) => rels.includes(link.rel));
  }

  /**
   * Returns all links whose relation type is *not* included in the given list.
   *
   * @param {Array.<string>} rels The relation types to exclude.
   * @returns {Array.<Link>} The links that do not match any of the given relation types.
   */
  getLinksWithOtherRels(rels) {
    return this.getLinks().filter((link) => !rels.includes(link.rel));
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
