import STAC from './stac.js';
import { isoToDate } from './datetime.js';
import { ensureBoundingBox, toGeoJSON } from './geo.js';
import { geojsonMediaType, isMediaType } from './mediatypes.js';
import { hasText } from './utils.js';
import { queryables, sortables } from './relationtypes.js';

/**
 * Class for common parts of Catalogs and Collections.
 *
 * Note that we implement getBoundingBox and getTemporalExtent here, although not defined for STAC catalogs.
 * This allows us to read those entities from the root catalog, if provided.
 * In case they are not provided, the methods will just return `null` as usual.
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
   * Returns a GeoJSON Feature for this STAC Collection.
   *
   * The Feature contains a Polygon or MultiPolygon based on the given number of valid bounding boxes.
   *
   * @param {boolean|FixOptions} fixAntimeridian Deprecated, has no effect. Bounding boxes are always split at the antimeridian if needed.
   * @returns {Object|null} GeoJSON object or `null`
   */
  toGeoJSON(fixAntimeridian = false) {
    let geojson = toGeoJSON(this.getBoundingBoxes(), fixAntimeridian);
    if (geojson) {
      geojson.id = this.id;
    }
    return geojson;
  }

  /**
   * Returns a single union 2D bounding box for the whole collection.
   *
   * @returns {BoundingBox|null}
   */
  getBoundingBox() {
    let bboxes = this.getRawBoundingBoxes();
    if (bboxes.length > 0) {
      return ensureBoundingBox(bboxes[0]);
    }
    return null;
  }

  /**
   * Returns the individual 2D bounding boxes for the collection,
   * without the union bounding box if multiple bounding boxes are given.
   *
   * @returns {Array.<BoundingBox>}
   */
  getBoundingBoxes() {
    let raw = this.getRawBoundingBoxes();
    if (raw.length === 1) {
      return [ensureBoundingBox(raw[0])];
    } else if (raw.length > 1) {
      return raw.slice(1).map(ensureBoundingBox);
    }
    return [];
  }

  /**
   * Returns all bounding boxes from the collection, including the union bounding box.
   *
   * @returns {Array.<BoundingBox>}
   */
  getRawBoundingBoxes() {
    let extents = this.extent?.spatial?.bbox;
    if (Array.isArray(extents) && extents.length > 0) {
      return extents;
    }
    return [];
  }

  /**
   * Returns a single temporal extent for the STAC Collection.
   *
   * @returns {Array.<Date|null>|null}
   */
  getTemporalExtent() {
    return this.getTemporalExtents()[0] || null;
  }

  /**
   * Returns the temporal extent(s) for the STAC Collection.
   *
   * @returns {Array.<Array.<Date|null>>}
   */
  getTemporalExtents() {
    const extents = this.extent?.temporal?.interval;
    if (Array.isArray(extents) && extents.length > 0) {
      return extents
        .filter((extent) => Array.isArray(extent) && (hasText(extent[0]) || hasText(extent[1])))
        .map((interval) => interval.map((datetime) => isoToDate(datetime)));
    }
    return [];
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
    let links = this.getLinksWithRels(['search']).filter((link) => isMediaType(link.type, geojsonMediaType));

    const getMethod = (link) => (hasText(link.method) ? link.method.toUpperCase() : 'GET');

    if (typeof method === 'string') {
      method = method.toUpperCase();
      return links.find((link) => getMethod(link) === method) || null;
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
   * Returns the link for queryables.
   *
   * @returns {Link|null} The queryables link
   */
  getQueryablesLink() {
    return this.getSchemaLinkWithRels(queryables);
  }

  /**
   * Returns the link for sortables.
   *
   * @returns {Link|null} The sortables link
   */
  getSortablesLink() {
    return this.getSchemaLinkWithRels(sortables);
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
   * @returns {Array.<Link>} The item links
   */
  getItemLinks() {
    return this.getStacLinksWithRel('item');
  }
}

export default CatalogLike;
