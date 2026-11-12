import Catalog from './catalog.js';
import Collection from './collection.js';
import STAC from './stac.js';
import { unionDateTime } from './datetime.js';
import { unionBoundingBox } from './geo.js';
import { isObject } from './utils.js';
import APICollection from './apicollection.js';

/**
 * Represents a list of catalogs (i.e. the sub-catalogs of a catalog) as returned by the
 * `/catalogs` endpoint of the STAC API - Multi-Tenant Catalogs extension.
 *
 * @class
 * @property {Array.<Catalog|Collection>} catalogs
 * @property {Array.<Link>} links
 *
 * @param {Object} data The STAC API Catalogs object
 * @param {string|null} absoluteUrl Absolute URL of the catalogs endpoint
 */
class CatalogCollection extends APICollection {
  /**
   * Returns whether the given data looks like a STAC API Catalogs response.
   *
   * @param {*} data
   * @returns {boolean}
   */
  static isResponse(data) {
    return isObject(data) && Array.isArray(data.catalogs);
  }

  constructor(data, absoluteUrl = null) {
    const keyMap = {
      // Skip malformed entries that can't be converted to a Catalog or Collection
      catalogs: (catalogs) =>
        Array.isArray(catalogs)
          ? catalogs
              .filter((catalog) => isObject(catalog))
              .map((catalog) => {
                if (catalog instanceof STAC) {
                  return catalog;
                }
                return catalog.type === 'Collection' ? new Collection(catalog) : new Catalog(catalog);
              })
          : [],
    };
    super(data, absoluteUrl, keyMap);
  }

  /**
   * Returns the type of the STAC object, here: 'CatalogCollection'.
   *
   * @returns {string}
   */
  getObjectType() {
    return 'CatalogCollection';
  }

  /**
   * Returns all catalogs.
   *
   * @returns {Array.<Catalog|Collection>} All sub-catalogs
   */
  getAll() {
    return Array.isArray(this.catalogs) ? this.catalogs.filter((catalog) => catalog instanceof STAC) : [];
  }

  /**
   * Check whether this given object is a list of catalogs (i.e. API Catalogs).
   *
   * @returns {boolean} `true` if the object is a STAC CatalogCollection, `false` otherwise.
   */
  get isCatalogCollection() {
    return true;
  }

  /**
   * Returns a GeoJSON Feature Collection for this STAC object.
   *
   * Catalogs without a geometry are omitted.
   *
   * @param {boolean|FixOptions} fixAntimeridian Deprecated, has no effect. Bounding boxes are always split at the antimeridian if needed.
   * @returns {Object|null} GeoJSON object or `null`
   */
  toGeoJSON(fixAntimeridian = false) {
    let features = this.getAll().map((catalog) => catalog.toGeoJSON(fixAntimeridian)).filter((geojson) => geojson !== null);
    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Returns a single 2D bounding box for all the catalogs.
   *
   * @returns {BoundingBox|null}
   */
  getBoundingBox() {
    return unionBoundingBox(this.getBoundingBoxes());
  }

  /**
   * Returns the 2D bounding boxes of the catalogs, excluding catalogs
   * without a bounding box.
   *
   * @returns {Array.<BoundingBox>}
   */
  getBoundingBoxes() {
    return this.getAll().map((catalog) => catalog.getBoundingBox()).filter((bbox) => bbox !== null);
  }

  /**
   * Returns a single temporal extent for all the catalogs.
   *
   * @returns {Array.<Date|null>|null}
   */
  getTemporalExtent() {
    return unionDateTime(this.getTemporalExtents());
  }

  /**
   * Returns the temporal extents of the catalogs, excluding catalogs
   * without a temporal extent.
   *
   * @returns {Array.<Array.<Date|null>>}
   */
  getTemporalExtents() {
    return this.getAll().map((catalog) => catalog.getTemporalExtent()).filter((extent) => extent !== null);
  }
}

export default CatalogCollection;
