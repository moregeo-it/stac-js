import Item from '../src/item';
import ItemCollection from '../src/itemcollection';
import fs from 'fs';

let item = JSON.parse(fs.readFileSync('./tests/examples/item.json'));
let item2 = JSON.parse(fs.readFileSync('./tests/examples/item-s2.json'));
let json = {type: "FeatureCollection", features: [item, item2]};
let ic = new ItemCollection(json);
let item1Date1 = new Date(Date.UTC(2020, 11, 14, 18, 1, 31));
let item1Date2 = new Date(Date.UTC(2020, 11, 14, 18, 3, 31));
let item2Date = new Date(Date.UTC(2023, 1, 27, 14, 47, 44));

test('Basics', () => {
  expect(ic.type).toBe("FeatureCollection");
  expect(ic.features.length).toBe(2);
  expect(ic.features.every(o => o instanceof Item)).toBeTruthy();
  expect(ic.getAbsoluteUrl()).toBe(null);
});

test('is...', () => {
  expect(ic.isItem()).toBeFalsy();
  expect(ic.isCatalog()).toBeFalsy();
  expect(ic.isCatalogLike()).toBeFalsy();
  expect(ic.isCollection()).toBeFalsy();
  expect(ic.isItemCollection()).toBeTruthy();
  expect(ic.isCollectionCollection()).toBeFalsy();
  expect(ic.isAsset()).toBeFalsy();
  expect(ic.isLink()).toBeFalsy();
  expect(ic.isBand()).toBeFalsy();
});

test('isResponse', () => {
  expect(ItemCollection.isResponse()).toBeFalsy();
  expect(ItemCollection.isResponse({})).toBeFalsy();
  expect(ItemCollection.isResponse({type: "FeatureCollection", features: []})).toBeTruthy();
  expect(ItemCollection.isResponse({type: "FeatureCollection", features: [], links: []})).toBeTruthy();
  expect(ItemCollection.isResponse({type: "FeatureCollection", features: {}})).toBeFalsy();
});

test('getObjectType', () => {
  expect(ic.getObjectType()).toBe("ItemCollection");
});

test('toJSON', () => {
  expect(ic.toJSON()).toEqual(json);
});

test('toGeoJSON', () => {
  expect(ic.toGeoJSON()).toEqual(json);
});

test('getBoundingBox', () => {
  expect(ic.getBoundingBox()).toEqual([
    -68.05964408799198,
    -18.17458941618659,
    172.95,
    1.36
  ]);
});

test('getBoundingBoxes', () => {
  expect(ic.getBoundingBoxes()).toEqual([item.bbox, item2.bbox]);
});

test('getMetadata', () => {
  expect(ic.getMetadata("id")).toBeUndefined();
  expect(ic.getMetadata("type")).toBe("FeatureCollection");
});

test('getTemporalExtent', () => {
  expect(ic.getTemporalExtent()).toEqual([item1Date1, item2Date]);
});

test('getTemporalExtents', () => {
  expect(ic.getTemporalExtents()).toEqual([[item1Date1, item1Date2], [item2Date, item2Date]]);
});

test('getAll', () => {
  expect(ic.getAll()).toEqual([new Item(item), new Item(item2)]);
});
