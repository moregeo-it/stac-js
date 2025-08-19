import Collection from './collection.js';
import { unionDateTime } from './datetime.js';
import { unionBoundingBox } from './geo.js';
import APICollection from './apicollection.js';

/**
 * Represents an Collections containing Collections.
 * 
 * @class
 * @property {Array.<Collection>} collections
 * @property {Array.<Link>} links
 * 
 * @param {Object} data The STAC API Collections object
 * @param {string|null} absoluteUrl Absolute URL of the STAC Item Collection
 */
class CollectionCollection extends APICollection {

  constructor(data, absoluteUrl = null) {
    const keyMap = {
      collections: collections => collections.map(
        collection => collection instanceof Collection ? collection : new Collection(collection)
      )
    };
    super(data, absoluteUrl, keyMap);
  }

  /**
   * Returns the type of the STAC object, here: 'CollectionCollection'.
   * 
   * @returns {string}
   */
  getObjectType() {
    return "CollectionCollection";
  }

  /**
   * Returns all collections.
   * 
   * @returns {Array.<Collection>} All STAC Collections
   */
  getAll() {
    return this.collections;
  }

  /**
   * Check whether this given object is a STAC Collection of Collections (i.e. API Collections).
   * 
   * @returns {boolean} `true` if the object is a STAC CollectionCollection, `false` otherwise.
   */
  isCollectionCollection() {
    return true;
  }

  /**
   * Returns a GeoJSON Feature Collection for this STAC object.
   * 
   * @returns {Object|null} GeoJSON object or `null`
   */
  toGeoJSON() {
    let features = this.collections
      .map(collection => collection.toGeoJSON())
      .filter(geojson => geojson !== null);
    return {
      type: "FeatureCollection",
      features
    };
  }

  /**
   * Returns a single 2D bounding box for all the STAC collections.
   * 
   * @returns {BoundingBox|null}
   */
  getBoundingBox() {
    return unionBoundingBox(this.getBoundingBoxes());
  }

  /**
   * Returns a list of 2D bounding boxes for all the STAC collections.
   * 
   * @returns {Array.<BoundingBox>}
   */
  getBoundingBoxes() {
    return this.collections.map(collection => collection.getBoundingBox());
  }

  /**
   * Returns a single temporal extent for the all the STAC collections.
   * 
   * @returns {Array.<Date|null>|null}
   */
  getTemporalExtent() {
    return unionDateTime(this.getTemporalExtents());
  }

  /**
   * Returns the temporal extent(s) for the all the STAC collections.
   * 
   * @returns {Array.<Array.<Date|null>>}
   */
  getTemporalExtents() {
    return this.collections.map(collection => collection.getTemporalExtent());
  }

}

export default CollectionCollection;
