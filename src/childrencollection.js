import Catalog from './catalog.js';
import Collection from './collection.js';
import STAC from './stac.js';
import { unionDateTime } from './datetime.js';
import { unionBoundingBox } from './geo.js';
import { isObject } from './utils.js';
import APICollection from './apicollection.js';

/**
 * Represents a list of children (Catalogs and Collections) as returned by the
 * `/children` endpoint of the STAC API - Children extension.
 *
 * @class
 * @property {Array.<Catalog|Collection>} children
 * @property {Array.<Link>} links
 *
 * @param {Object} data The STAC API Children object
 * @param {string|null} absoluteUrl Absolute URL of the children endpoint
 */
class ChildrenCollection extends APICollection {
  /**
   * Returns whether the given data looks like a STAC API Children response.
   *
   * @param {*} data
   * @returns {boolean}
   */
  static isResponse(data) {
    return isObject(data) && Array.isArray(data.children);
  }

  constructor(data, absoluteUrl = null) {
    const keyMap = {
      children: (children) =>
        children.map((child) => {
          if (child instanceof STAC) {
            return child;
          }
          return child?.type === 'Collection' ? new Collection(child) : new Catalog(child);
        }),
    };
    super(data, absoluteUrl, keyMap);
  }

  /**
   * Returns the type of the STAC object, here: 'ChildrenCollection'.
   *
   * @returns {string}
   */
  getObjectType() {
    return 'ChildrenCollection';
  }

  /**
   * Returns all children.
   *
   * @returns {Array.<Catalog|Collection>} All child Catalogs and Collections
   */
  getAll() {
    return this.children;
  }

  /**
   * Check whether this given object is a list of children (i.e. API Children).
   *
   * @returns {boolean} `true` if the object is a STAC ChildrenCollection, `false` otherwise.
   */
  get isChildrenCollection() {
    return true;
  }

  /**
   * Returns a GeoJSON Feature Collection for this STAC object.
   *
   * Children without a geometry (e.g. Catalogs) are omitted.
   *
   * @param {boolean|FixOptions} fixAntimeridian Deprecated, has no effect. Bounding boxes are always split at the antimeridian if needed.
   * @returns {Object|null} GeoJSON object or `null`
   */
  toGeoJSON(fixAntimeridian = false) {
    let features = this.children.map((child) => child.toGeoJSON(fixAntimeridian)).filter((geojson) => geojson !== null);
    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Returns a single 2D bounding box for all the children.
   *
   * @returns {BoundingBox|null}
   */
  getBoundingBox() {
    return unionBoundingBox(this.getBoundingBoxes());
  }

  /**
   * Returns the 2D bounding boxes of the children, excluding children
   * without a bounding box (e.g. Catalogs).
   *
   * @returns {Array.<BoundingBox>}
   */
  getBoundingBoxes() {
    return this.children.map((child) => child.getBoundingBox()).filter((bbox) => bbox !== null);
  }

  /**
   * Returns a single temporal extent for all the children.
   *
   * @returns {Array.<Date|null>|null}
   */
  getTemporalExtent() {
    return unionDateTime(this.getTemporalExtents());
  }

  /**
   * Returns the temporal extents of the children, excluding children
   * without a temporal extent (e.g. Catalogs).
   *
   * @returns {Array.<Array.<Date|null>>}
   */
  getTemporalExtents() {
    return this.children.map((child) => child.getTemporalExtent()).filter((extent) => extent !== null);
  }
}

export default ChildrenCollection;
