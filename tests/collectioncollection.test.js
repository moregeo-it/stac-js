import Collection from '../src/collection';
import CollectionCollection from '../src/collectioncollection';
import fs from 'fs';

let collection = JSON.parse(fs.readFileSync('./tests/examples/collection.json'));
let json = {collections: [collection], links: []};
let cc = new CollectionCollection(json);
let bbox = [172.91,1.34,172.95,1.36];
let temporal = [new Date(Date.UTC(2020, 11, 11, 22, 38, 32, 125)), new Date(Date.UTC(2020, 11, 14, 18, 2, 31, 437))];

test('Basics', () => {
  expect(cc.type).not.toBeDefined();
  expect(cc.getAbsoluteUrl()).toBe(null);
});

test('is...', () => {
  expect(cc.isItem()).toBeFalsy();
  expect(cc.isCatalog()).toBeFalsy();
  expect(cc.isCatalogLike()).toBeFalsy();
  expect(cc.isCollection()).toBeFalsy();
  expect(cc.isItemCollection()).toBeFalsy();
  expect(cc.isCollectionCollection()).toBeTruthy();
  expect(cc.isAsset()).toBeFalsy();
  expect(cc.isLink()).toBeFalsy();
  expect(cc.isBand()).toBeFalsy();
});

test('isResponse', () => {
  expect(CollectionCollection.isResponse()).toBeFalsy();
  expect(CollectionCollection.isResponse({})).toBeFalsy();
  expect(CollectionCollection.isResponse({collections: []})).toBeTruthy();
  expect(CollectionCollection.isResponse({collections: [], links: []})).toBeTruthy();
  expect(CollectionCollection.isResponse({collections: {}, links: []})).toBeFalsy();
});

test('getObjectType', () => {
  expect(cc.getObjectType()).toBe("CollectionCollection");
});

test('toJSON', () => {
  expect(cc.toJSON()).toEqual(json);
});

test('toGeoJSON', () => {
  let geojson = cc.toGeoJSON();
  expect(geojson).not.toBeNull();
  expect(geojson.type).toBe("FeatureCollection");
  expect(geojson.features.length).toBe(1);
});

test('getBoundingBox', () => {
  expect(cc.getBoundingBox()).toEqual(bbox);
});

test('getBoundingBoxes', () => {
  expect(cc.getBoundingBoxes()).toEqual([bbox]);
});

test('getMetadata', () => {
  expect(cc.getMetadata("id")).toBeUndefined();
  expect(cc.getMetadata("type")).toBeUndefined();
  expect(cc.getMetadata("links")).toEqual([]);
});

test('getTemporalExtent', () => {
  expect(cc.getTemporalExtent()).toEqual(temporal);
});

test('getTemporalExtents', () => {
  expect(cc.getTemporalExtents()).toEqual([temporal]);
});

test('getAll', () => {
  expect(cc.getAll()).toEqual([new Collection(collection)]);
});
