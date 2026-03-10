import Collection from '../src/collection';
import Link from '../src/link';
import fs from 'fs';

let json = JSON.parse(fs.readFileSync('./tests/examples/collection.json'));
let url = 'https://example.com/api';
let c = new Collection(json, url);
let bbox = [172.91, 1.34, 172.95, 1.36];
let temporal = [new Date(Date.UTC(2020, 11, 11, 22, 38, 32, 125)), new Date(Date.UTC(2020, 11, 14, 18, 2, 31, 437))];

test('Basics', () => {
  expect(c.stac_version).toBe('1.1.0');
  expect(c.getMetadata('stac_version')).toBe('1.1.0');
  expect(c.getAbsoluteUrl()).toBe(url);
});

test('is...', () => {
  expect(c.isItem()).toBeFalsy();
  expect(c.isCatalog()).toBeFalsy();
  expect(c.isCatalogLike()).toBeTruthy();
  expect(c.isCollection()).toBeTruthy();
  expect(c.isItemCollection()).toBeFalsy();
  expect(c.isCollectionCollection()).toBeFalsy();
  expect(c.isAsset()).toBeFalsy();
  expect(c.isLink()).toBeFalsy();
  expect(c.isBand()).toBeFalsy();
  expect(c.isSTAC()).toBeTruthy();
  expect(c.isApiCollection()).toBeFalsy();
  expect(c.isReference()).toBeFalsy();
});

test('getObjectType', () => {
  expect(c.getObjectType()).toBe('Collection');
});

test('toJSON', () => {
  expect(c.toJSON()).toEqual(json);
});

test('toGeoJSON', () => {
  let geojson = c.toGeoJSON();
  expect(geojson).not.toBeNull();
  expect(geojson.id).toBe(c.id);
  expect(geojson.type).toBe('Feature');
  expect(geojson.geometry.type).toBe('Polygon');
  expect(geojson.geometry.coordinates.length).toBe(1);
  expect(geojson.properties).toEqual({});
});

test('getBoundingBox', () => {
  expect(c.getBoundingBox()).toEqual(bbox);
});

test('getBoundingBoxes', () => {
  expect(c.getBoundingBoxes()).toEqual([bbox]);
});

test('getTemporalExtent', () => {
  expect(c.getTemporalExtent()).toEqual(temporal);
});

test('getTemporalExtents', () => {
  expect(c.getTemporalExtents()).toEqual([temporal]);
});

test('getAsset', () => {
  expect(c.getAsset('test')).toBeNull();
});

test('getAssets', () => {
  expect(c.getAssets()).toEqual([]);
});

test('getQueryablesLink', () => {
  let collection = new Collection({
    ...json,
    links: [
      ...json.links,
      {
        rel: 'http://www.opengis.net/def/rel/ogc/1.0/queryables',
        href: 'https://example.com/queryables',
        type: 'application/schema+json',
      },
    ],
  });
  let link = collection.getQueryablesLink();
  expect(link).toBeInstanceOf(Link);
});

test('getLocaleLink', () => {
  let collection = new Collection({
    id: 'test',
    type: 'Collection',
    stac_version: '1.1.0',
    description: 'test',
    extent: { spatial: { bbox: [[-180, -90, 180, 90]] }, temporal: { interval: [[null, null]] } },
    license: 'MIT',
    links: [{ rel: 'alternate', href: 'https://example.com/de', type: 'application/json', hreflang: 'de' }],
  });
  let link = collection.getLocaleLink('de');
  expect(link).toBeInstanceOf(Link);
  expect(link.href).toBe('https://example.com/de');
});
