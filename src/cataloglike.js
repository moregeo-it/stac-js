import STAC from './stac.js';
import { geojsonMediaType, isMediaType } from "./mediatypes.js";
import { hasText } from "./utils.js";

/**
 * Class for common parts of Catalogs and Collections.
 * 
 * Don't instantiate this class!
 * 
 * @interface
 * @param {Object} data The STAC Catalog or Collection object
 * @param {string|null} absoluteUrl Absolute URL of the STAC Catalog or Collection
 * @param {Object.<string, function>} keyMap Keys and functions that convert the values to stac-js objects.
 * @param {Array.<string>} privateKeys Keys that are private members of the stac-js objects (for cloning and export).
 */
class CatalogLike extends STAC {

  constructor(data, absoluteUrl = null, keyMap = {}, privateKeys = []) {
    super(data, absoluteUrl, keyMap, privateKeys);
  }

  /**
   * Returns the type of the STAC object, here: 'Catalog' or 'Collection'.
   * 
   * @returns {string}
   */
  getObjectType() {
    return this.type;
  }

  /**
   * Returns the search link, if present.
   * 
   * If a specific method is provied, can exclude other methods from being returned.
   * If no method is provided, prefers QUERY over POST over GET.
   * 
   * @returns {Link|null} The search link
   */
  getSearchLink(method = null) {
    // The search link MUST be 'application/geo+json' as otherwise it's likely not STAC
    // See https://github.com/opengeospatial/ogcapi-features/issues/832
    let links = this.getLinksWithRels(['search'])
      .filter(link => isMediaType(link.type, geojsonMediaType));
    
    const getMethod = (link) => hasText(link.method) ? link.method.toUpperCase() : 'GET';

    if (typeof method === 'string') {
      method = method.toUpperCase();
      return links.find(link => getMethod(link) === method) || null;
    }

    links.sort((a, b) => {
      const methodA = getMethod(a);
      const methodB = getMethod(b);
      // We can just sort alphabetically (Z->A) here, because QUERY > POST > GET
      if (methodA < methodB) {
        return 1;
      }
      if (methodA > methodB) {
        return -1;
      }
      return 0;
    });
    return links[0] || null;
  }

  /**
   * Returns the link for API collections, if present.
   * 
   * @returns {Link|null} The API collections link
   */
  getApiCollectionsLink() {
    return this.getStacLinkWithRel('data');
  }

  /**
   * Returns the link for API items, if present.
   * 
   * @returns {Link|null} The API items link
   */
  getApiItemsLink() {
    return this.getStacLinkWithRel('items');
  }

  /**
   * Returns all child links.
   * 
   * @returns {Array.<Link>} The child links
   */
  getChildLinks() {
    return this.getStacLinksWithRel('child');
  }

  /**
   * Returns all item links.
   * 
   * @returns {Array.<Link>} The child links
   */
  getItemLinks() {
    return this.getStacLinksWithRel('item');
  }

}

export default CatalogLike;
