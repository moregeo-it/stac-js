import Asset from './asset.js';
import Band from './band.js';
import CatalogLike from './cataloglike.js';
import { isoToDate } from './datetime.js';
import { ensureBoundingBox, toGeoJSON } from './geo.js';
import { hasText, isObject } from './utils.js';

/**
 * Extents
 *
 * @typedef {Object} Extent
 * @property {SpatialExtent} spatial Spatial extents
 * @property {TemporalExtent} temporal Temporal extents
 */
/**
 * Spatial Extents
 *
 * @typedef {Object} SpatialExtent
 * @property {Array.<Array<number>>} bbox Bounding boxes
 */
/**
 * Temporal Extents
 *
 * @typedef {Object} TemporalExtent
 * @property {Array.<Array<string|null>>} interval Intervals
 */

/**
 * A STAC Collection.
 *
 * You can access all properties of the given STAC Collection object directly, e.g. `collection.title`.
 *
 * @class
 * @property {string} stac_version
 * @property {?Array.<string>} stac_extensions
 * @property {string} type
 * @property {string} id
 * @property {?string} title
 * @property {string} description
 * @property {?Array.<string>} keywords
 * @property {string} license
 * @property {Array.<Provider>} providers
 * @property {Extent} extent
 * @property {Object.<string, Array|Object>} summaries
 * @property {Array.<Link>} links
 * @property {Object.<string, Asset>} assets
 *
 * @param {Object} data The STAC Collection object
 * @param {string|null} absoluteUrl Absolute URL of the STAC Collection
 */
class Collection extends CatalogLike {
  constructor(data, absoluteUrl = null) {
    const keyMap = {
      assets: Asset.fromAssets,
      item_assets: Asset.fromAssets,
    };
    super(data, absoluteUrl, keyMap);
  }

  /**
   * Returns a GeoJSON Feature for this STAC Collection.
   *
   * The Feature contains a Polygon or MultiPolygon based on the given number of valid bounding boxes.
   *
   * @returns {Object|null} GeoJSON object or `null`
   */
  toGeoJSON() {
    let geojson = toGeoJSON(this.getBoundingBoxes());
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
    return null;
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
    let extents = this.extent?.temporal?.interval;
    if (Array.isArray(extents) && extents.length > 0) {
      return extents
        .filter((extent) => Array.isArray(extent) && (hasText(extent[0]) || hasText(extent[1])))
        .map((interval) => interval.map((datetime) => isoToDate(datetime)));
    }
    return [];
  }

  /**
   * Returns metadata from the Collection summaries for the given field name.
   *
   * @param {string} field Field name
   * @returns {Array.<*>|Object|undefined} The value of the field
   */
  getSummary(field) {
    if (isObject(this.summaries)) {
      return this.summaries[field];
    }
    return undefined;
  }

  /**
   * Returns the bands.
   *
   * @returns {Array.<Band>}
   */
  getBands() {
    let bands = this.getMetadata('bands');
    if (!Array.isArray(bands)) {
      bands = this.getSummary('bands');
    }
    if (!Array.isArray(bands)) {
      return [];
    }
    return Band.fromBands(bands, this);
  }
}

export default Collection;
