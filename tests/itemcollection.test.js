import Item from '../src/item';
import ItemCollection from '../src/itemcollection';
import Link from '../src/link';
import fs from 'fs';

let item = JSON.parse(fs.readFileSync('./tests/examples/item.json'));
let item2 = JSON.parse(fs.readFileSync('./tests/examples/item-s2.json'));
let json = { type: 'FeatureCollection', features: [item, item2] };
let ic = new ItemCollection(json);
let item1Date1 = new Date(Date.UTC(2020, 11, 14, 18, 1, 31));
let item1Date2 = new Date(Date.UTC(2020, 11, 14, 18, 3, 31));
let item2Date = new Date(Date.UTC(2023, 1, 27, 14, 47, 44));

test('Basics', () => {
  expect(ic.type).toBe('FeatureCollection');
  expect(ic.features.length).toBe(2);
  expect(ic.features.every((o) => o instanceof Item)).toBeTruthy();
  expect(ic.getAbsoluteUrl()).toBe(null);
});

test('is...', () => {
  expect(ic.isItem).toBeFalsy();
  expect(ic.isCatalog).toBeFalsy();
  expect(ic.isCatalogLike).toBeFalsy();
  expect(ic.isCollection).toBeFalsy();
  expect(ic.isItemCollection).toBeTruthy();
  expect(ic.isCollectionCollection).toBeFalsy();
  expect(ic.isAsset).toBeFalsy();
  expect(ic.isLink).toBeFalsy();
  expect(ic.isBand).toBeFalsy();
  expect(ic.isSTAC).toBeFalsy();
  expect(ic.isApiCollection).toBeTruthy();
  expect(ic.isReference).toBeFalsy();
});

test('isResponse', () => {
  expect(ItemCollection.isResponse()).toBeFalsy();
  expect(ItemCollection.isResponse({})).toBeFalsy();
  expect(ItemCollection.isResponse({ type: 'FeatureCollection', features: [] })).toBeTruthy();
  expect(ItemCollection.isResponse({ type: 'FeatureCollection', features: [], links: [] })).toBeTruthy();
  expect(ItemCollection.isResponse({ type: 'FeatureCollection', features: {} })).toBeFalsy();
});

test('getObjectType', () => {
  expect(ic.getObjectType()).toBe('ItemCollection');
});

test('toJSON', () => {
  expect(ic.toJSON()).toEqual(json);
});

test('toGeoJSON', () => {
  expect(ic.toGeoJSON()).toEqual(json);
});

test('getBoundingBox', () => {
  expect(ic.getBoundingBox()).toEqual([-68.05964408799198, -18.17458941618659, 172.95, 1.36]);
});

test('getBoundingBoxes', () => {
  expect(ic.getBoundingBoxes()).toEqual([item.bbox, item2.bbox]);
});

test('getMetadata', () => {
  expect(ic.getMetadata('id')).toBeUndefined();
  expect(ic.getMetadata('type')).toBe('FeatureCollection');
});

test('getTemporalExtent', () => {
  expect(ic.getTemporalExtent()).toEqual([item1Date1, item2Date]);
});

test('getTemporalExtents', () => {
  expect(ic.getTemporalExtents()).toEqual([
    [item1Date1, item1Date2],
    [item2Date, item2Date],
  ]);
});

test('getAll', () => {
  expect(ic.getAll()).toEqual([new Item(item), new Item(item2)]);
});

describe('getPaginationLinks', () => {
  test('returns all nulls when no pagination links exist', () => {
    let ic2 = new ItemCollection({
      type: 'FeatureCollection',
      features: [],
      links: [],
    });
    let pages = ic2.getPaginationLinks();
    expect(pages.first).toBeNull();
    expect(pages.prev).toBeNull();
    expect(pages.next).toBeNull();
    expect(pages.last).toBeNull();
  });

  test('returns next link', () => {
    let ic2 = new ItemCollection({
      type: 'FeatureCollection',
      features: [],
      links: [{ rel: 'next', href: 'https://example.com/items?page=2' }],
    });
    let pages = ic2.getPaginationLinks();
    expect(pages.next).toBeInstanceOf(Link);
    expect(pages.next.href).toBe('https://example.com/items?page=2');
    expect(pages.first).toBeNull();
    expect(pages.prev).toBeNull();
    expect(pages.last).toBeNull();
  });

  test('returns prev link', () => {
    let ic2 = new ItemCollection({
      type: 'FeatureCollection',
      features: [],
      links: [{ rel: 'prev', href: 'https://example.com/items?page=1' }],
    });
    let pages = ic2.getPaginationLinks();
    expect(pages.prev).toBeInstanceOf(Link);
    expect(pages.prev.href).toBe('https://example.com/items?page=1');
  });

  test('normalizes "previous" rel to "prev"', () => {
    let ic2 = new ItemCollection({
      type: 'FeatureCollection',
      features: [],
      links: [{ rel: 'previous', href: 'https://example.com/items?page=1' }],
    });
    let pages = ic2.getPaginationLinks();
    expect(pages.prev).toBeInstanceOf(Link);
    expect(pages.prev.href).toBe('https://example.com/items?page=1');
  });

  test('returns first and last links', () => {
    let ic2 = new ItemCollection({
      type: 'FeatureCollection',
      features: [],
      links: [
        { rel: 'first', href: 'https://example.com/items?page=1' },
        { rel: 'last', href: 'https://example.com/items?page=10' },
      ],
    });
    let pages = ic2.getPaginationLinks();
    expect(pages.first).toBeInstanceOf(Link);
    expect(pages.first.href).toBe('https://example.com/items?page=1');
    expect(pages.last).toBeInstanceOf(Link);
    expect(pages.last.href).toBe('https://example.com/items?page=10');
  });

  test('returns all pagination links', () => {
    let ic2 = new ItemCollection({
      type: 'FeatureCollection',
      features: [],
      links: [
        { rel: 'first', href: 'https://example.com/items?page=1' },
        { rel: 'prev', href: 'https://example.com/items?page=2' },
        { rel: 'next', href: 'https://example.com/items?page=4' },
        { rel: 'last', href: 'https://example.com/items?page=10' },
      ],
    });
    let pages = ic2.getPaginationLinks();
    expect(pages.first).not.toBeNull();
    expect(pages.prev).not.toBeNull();
    expect(pages.next).not.toBeNull();
    expect(pages.last).not.toBeNull();
  });

  test('ignores non-pagination links', () => {
    let ic2 = new ItemCollection({
      type: 'FeatureCollection',
      features: [],
      links: [
        { rel: 'self', href: 'https://example.com/items' },
        { rel: 'root', href: 'https://example.com' },
        { rel: 'next', href: 'https://example.com/items?page=2' },
      ],
    });
    let pages = ic2.getPaginationLinks();
    expect(pages.next).not.toBeNull();
    expect(pages.first).toBeNull();
    expect(pages.prev).toBeNull();
    expect(pages.last).toBeNull();
  });
});
