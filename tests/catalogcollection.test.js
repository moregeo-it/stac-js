import Catalog from '../src/catalog';
import CatalogCollection from '../src/catalogcollection';
import Collection from '../src/collection';
import Link from '../src/link';
import fs from 'fs';

let catalog = JSON.parse(fs.readFileSync('./tests/examples/catalog.json'));
let collection = JSON.parse(fs.readFileSync('./tests/examples/collection.json'));
let json = { catalogs: [catalog, collection], links: [] };
let cc = new CatalogCollection(json);
let bbox = [172.91, 1.34, 172.95, 1.36];
let temporal = [new Date(Date.UTC(2020, 11, 11, 22, 38, 32, 125)), new Date(Date.UTC(2020, 11, 14, 18, 2, 31, 437))];

test('Basics', () => {
  expect(cc.type).not.toBeDefined();
  expect(cc.getAbsoluteUrl()).toBe(null);
});

test('is...', () => {
  expect(cc.isItem).toBeFalsy();
  expect(cc.isCatalog).toBeFalsy();
  expect(cc.isCatalogLike).toBeFalsy();
  expect(cc.isCollection).toBeFalsy();
  expect(cc.isItemCollection).toBeFalsy();
  expect(cc.isCollectionCollection).toBeFalsy();
  expect(cc.isChildrenCollection).toBeFalsy();
  expect(cc.isCatalogCollection).toBeTruthy();
  expect(cc.isAsset).toBeFalsy();
  expect(cc.isLink).toBeFalsy();
  expect(cc.isBand).toBeFalsy();
  expect(cc.isSTAC).toBeFalsy();
  expect(cc.isApiCollection).toBeTruthy();
  expect(cc.isReference).toBeFalsy();
});

test('isResponse', () => {
  expect(CatalogCollection.isResponse()).toBeFalsy();
  expect(CatalogCollection.isResponse({})).toBeFalsy();
  expect(CatalogCollection.isResponse({ catalogs: [] })).toBeTruthy();
  expect(CatalogCollection.isResponse({ catalogs: [], links: [] })).toBeTruthy();
  expect(CatalogCollection.isResponse({ catalogs: {}, links: [] })).toBeFalsy();
});

test('getObjectType', () => {
  expect(cc.getObjectType()).toBe('CatalogCollection');
});

test('toJSON', () => {
  expect(cc.toJSON()).toEqual(json);
});

test('catalogs are typed as Catalog and Collection', () => {
  expect(cc.catalogs[0]).toBeInstanceOf(Catalog);
  expect(cc.catalogs[1]).toBeInstanceOf(Collection);
});

test('malformed entries are skipped', () => {
  let cc2 = new CatalogCollection({ catalogs: [catalog, null, 'invalid', 42], links: [] });
  expect(cc2.catalogs.length).toBe(1);
  expect(cc2.catalogs[0]).toBeInstanceOf(Catalog);
});

test('toGeoJSON omits catalogs without geometry', () => {
  let geojson = cc.toGeoJSON();
  expect(geojson).not.toBeNull();
  expect(geojson.type).toBe('FeatureCollection');
  // Only the Collection has a bounding box, the Catalog is omitted
  expect(geojson.features.length).toBe(1);
});

test('getBoundingBox', () => {
  expect(cc.getBoundingBox()).toEqual(bbox);
});

test('getBoundingBoxes excludes catalogs without a bounding box', () => {
  expect(cc.getBoundingBoxes()).toEqual([bbox]);
});

test('getMetadata', () => {
  expect(cc.getMetadata('id')).toBeUndefined();
  expect(cc.getMetadata('type')).toBeUndefined();
  expect(cc.getMetadata('links')).toEqual([]);
});

test('getTemporalExtent', () => {
  expect(cc.getTemporalExtent()).toEqual(temporal);
});

test('getTemporalExtents excludes catalogs without a temporal extent', () => {
  expect(cc.getTemporalExtents()).toEqual([temporal]);
});

test('getAll', () => {
  expect(cc.getAll()).toEqual([new Catalog(catalog), new Collection(collection)]);
});

test('getPaginationLinks', () => {
  let cc2 = new CatalogCollection({
    catalogs: [],
    links: [
      { rel: 'next', href: 'https://example.com/catalogs?page=2' },
      { rel: 'prev', href: 'https://example.com/catalogs?page=0' },
    ],
  });
  let pages = cc2.getPaginationLinks();
  expect(pages.next).toBeInstanceOf(Link);
  expect(pages.prev).toBeInstanceOf(Link);
});
