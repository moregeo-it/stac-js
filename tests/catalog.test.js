import Catalog from '../src/catalog';
import fs from 'fs';

let json = JSON.parse(fs.readFileSync('./tests/examples/catalog.json'));
let c = new Catalog(json);

test('Basics', () => {
  expect(c.id).toBe('example');
  expect(c.getMetadata('id')).toBe('example');
  expect(c.getAbsoluteUrl()).toBe(
    'https://raw.githubusercontent.com/radiantearth/stac-spec/v1.1.0/examples/catalog.json',
  );
});

test('is...', () => {
  expect(c.isItem()).toBeFalsy();
  expect(c.isCatalog()).toBeTruthy();
  expect(c.isCatalogLike()).toBeTruthy();
  expect(c.isCollection()).toBeFalsy();
  expect(c.isItemCollection()).toBeFalsy();
  expect(c.isCollectionCollection()).toBeFalsy();
  expect(c.isAsset()).toBeFalsy();
  expect(c.isLink()).toBeFalsy();
  expect(c.isBand()).toBeFalsy();
});

test('getObjectType', () => {
  expect(c.getObjectType()).toBe('Catalog');
});

test('toJSON', () => {
  expect(c.toJSON()).toEqual(json);
});

test('toGeoJSON', () => {
  expect(c.toGeoJSON()).toBeNull();
});

test('getSearchLink', () => {
  expect(c.getSearchLink()).toBeNull();
});

test('getApiCollectionsLink', () => {
  expect(c.getApiCollectionsLink()).toBeNull();
});

test('getApiItemsLink', () => {
  expect(c.getApiItemsLink()).toBeNull();
});

test('getChildLinks', () => {
  let childs = c.getChildLinks();
  expect(Array.isArray(childs)).toBeTruthy();
  expect(c.getChildLinks().length).toBe(3);
  expect(
    childs.every((child) => child && typeof child === 'object' && child.href && child.type && child.rel === 'child'),
  ).toBeTruthy();
});

test('getItemLinks', () => {
  let items = c.getItemLinks();
  expect(Array.isArray(items)).toBeTruthy();
  expect(items.length).toBe(1);
  expect(
    items.every((item) => item && typeof item === 'object' && item.href && item.type && item.rel === 'item'),
  ).toBeTruthy();
});

test('getBoundingBox', () => {
  expect(c.getBoundingBox()).toBeNull();
});

test('getBoundingBoxes', () => {
  expect(c.getBoundingBoxes()).toEqual([]);
});

test('getTemporalExtent', () => {
  expect(c.getTemporalExtent()).toBeNull();
});

test('getTemporalExtents', () => {
  expect(c.getTemporalExtents()).toEqual([]);
});

test('getAsset', () => {
  expect(c.getAsset('test')).toBeNull();
});

test('getAssets', () => {
  expect(c.getAssets()).toEqual([]);
});
