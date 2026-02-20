import STACHypermedia from './hypermedia.js';
import { pagination } from './relationtypes.js';

/**
 * A STAC API Collection (i.e. an ItemCollection or a CollectionCollection)
 * 
 * You can access all properties of the given STAC Catalog object directly, e.g. `collection.links`.
 * 
 * Don't instantiate this class!
 * 
 * @interface
 * @param {Object} data The STAC API Collection object
 * @param {string|null} absoluteUrl Absolute URL of the STAC Item Collection
 * @param {Object.<string, function>} keyMap Keys and functions that convert the values to stac-js objects.
 * @param {Array.<string>} privateKeys Keys that are private members of the stac-js objects (for cloning and export).
 */
class APICollection extends STACHypermedia {

  constructor(data, absoluteUrl = null, keyMap = {}, privateKeys = []) {
    super(data, absoluteUrl, keyMap, privateKeys);
  }

  /**
   * Returns all STAC entities in this list.
   * 
   * @returns {Array.<STAC>} All STAC entities
   */
  getAll() {
    return [];
  }

  /**
   * Returns the pagination links for this response.
   * 
   * @returns {PaginationLinks} Pagination links
   */
  getPaginationLinks() {
    /**
     * Pagination links.
     * 
     * @typedef {Object} PaginationLinks
     * @property {Link|null} first - Link to the first page
     * @property {Link|null} prev - Link to the previous page
     * @property {Link|null} next - Link to the next page
     * @property {Link|null} last - Link to the last page
     */
    const pages = {
      first: null,
      prev: null,
      next: null,
      last: null
    };
    const pageLinks = this.getLinksWithRels(pagination);
    for (const pageLink of pageLinks) {
      const rel = pageLink.rel === 'previous' ? 'prev' : pageLink.rel;
      pages[rel] = pageLink;
    }
    return pages;
  }

}

export default APICollection;
