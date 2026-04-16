import Migrate from '@radiantearth/stac-migrate';
import APICollection from './apicollection.js';
import Asset from './asset.js';
import Band from './band.js';
import Catalog from './catalog.js';
import CatalogLike from './cataloglike.js';
import Collection from './collection.js';
import CollectionCollection from './collectioncollection.js';
import Item from './item.js';
import ItemCollection from './itemcollection.js';
import Link from './link.js';
import STACHypermedia from './hypermedia.js';
import STACObject from './object.js';
import STACReference from './reference.js';
import STAC from './stac.js';

/**
 * Creates the corresponding object for a object that conforms to the STAC specification.
 *
 * This creates either a Catalog, a Collection or an Item instance.
 * By default it migrates the data to the latest STAC version, but doesn't update the version number.
 *
 * @param {Object} data The STAC object
 * @param {boolean} migrate `true` to migrate to the latest version, `false` otherwise
 * @param {boolean} updateVersionNumber `true` to update the version number (to the latest version), `false` otherwise. Only applies if `migrate` is set to `true`.
 * @returns {Catalog|Collection|CollectionCollection|Item|ItemCollection} The created object instance.
 */
export default function create(data, migrate = true, updateVersionNumber = false) {
  if (migrate) {
    data = Migrate.stac(data, updateVersionNumber);
  }
  if (data.type === 'Feature') {
    return new Item(data);
  } else if (data.type === 'FeatureCollection') {
    return new ItemCollection(data);
  } else if (
    data.type === 'Collection' ||
    (!data.type && typeof data.extent !== 'undefined' && typeof data.license !== 'undefined')
  ) {
    return new Collection(data);
  } else if (!data.type && Array.isArray(data.collections)) {
    return new CollectionCollection(data);
  } else {
    return new Catalog(data);
  }
}

export {
  APICollection,
  Asset,
  Band,
  Catalog,
  CatalogLike,
  Collection,
  CollectionCollection,
  Item,
  ItemCollection,
  Link,
  STAC,
  STACHypermedia,
  STACObject,
  STACReference,
};
