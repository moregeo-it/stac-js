import Catalog from '../src/catalog';
import Link from '../src/link';
import fs from 'fs';

let apiJson = JSON.parse(fs.readFileSync('./tests/examples/api.json'));

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
  expect(c.isItem).toBeFalsy();
  expect(c.isCatalog).toBeTruthy();
  expect(c.isCatalogLike).toBeTruthy();
  expect(c.isCollection).toBeFalsy();
  expect(c.isItemCollection).toBeFalsy();
  expect(c.isCollectionCollection).toBeFalsy();
  expect(c.isAsset).toBeFalsy();
  expect(c.isLink).toBeFalsy();
  expect(c.isBand).toBeFalsy();
  expect(c.isSTAC).toBeTruthy();
  expect(c.isApiCollection).toBeFalsy();
  expect(c.isReference).toBeFalsy();
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

describe('getQueryablesLink', () => {
  test('returns queryables link with ogc rel', () => {
    let catalog = new Catalog(apiJson);
    let link = catalog.getQueryablesLink();
    expect(link).toBeInstanceOf(Link);
    expect(link.href).toBe('https://example.com/queryables');
  });

  test('returns null when no queryables link exists', () => {
    let catalog = new Catalog({
      id: 'test',
      type: 'Catalog',
      stac_version: '1.1.0',
      description: 'test',
      links: [{ rel: 'self', href: 'https://example.com' }],
    });
    expect(catalog.getQueryablesLink()).toBeNull();
  });

  test('returns queryables link with deprecated rel', () => {
    let catalog = new Catalog({
      id: 'test',
      type: 'Catalog',
      stac_version: '1.1.0',
      description: 'test',
      links: [{ rel: 'queryables', href: 'https://example.com/queryables', type: 'application/schema+json' }],
    });
    let link = catalog.getQueryablesLink();
    expect(link).toBeInstanceOf(Link);
    expect(link.href).toBe('https://example.com/queryables');
  });

  test('returns queryables link with ogc-rel:queryables', () => {
    let catalog = new Catalog({
      id: 'test',
      type: 'Catalog',
      stac_version: '1.1.0',
      description: 'test',
      links: [{ rel: 'ogc-rel:queryables', href: 'https://example.com/q', type: 'application/schema+json' }],
    });
    let link = catalog.getQueryablesLink();
    expect(link).toBeInstanceOf(Link);
    expect(link.href).toBe('https://example.com/q');
  });

  test('filters out non-schema media types', () => {
    let catalog = new Catalog({
      id: 'test',
      type: 'Catalog',
      stac_version: '1.1.0',
      description: 'test',
      links: [
        {
          rel: 'http://www.opengis.net/def/rel/ogc/1.0/queryables',
          href: 'https://example.com/queryables',
          type: 'text/html',
        },
      ],
    });
    expect(catalog.getQueryablesLink()).toBeNull();
  });
});

describe('getLocaleLink', () => {
  test('returns null when no alternate links exist', () => {
    let catalog = new Catalog({
      id: 'test',
      type: 'Catalog',
      stac_version: '1.1.0',
      description: 'test',
      links: [{ rel: 'self', href: 'https://example.com', type: 'application/json' }],
    });
    expect(catalog.getLocaleLink('de')).toBeNull();
  });

  test('returns null when alternate links have no hreflang', () => {
    let catalog = new Catalog({
      id: 'test',
      type: 'Catalog',
      stac_version: '1.1.0',
      description: 'test',
      links: [
        { rel: 'self', href: 'https://example.com', type: 'application/json' },
        { rel: 'alternate', href: 'https://example.com/other', type: 'application/json' },
      ],
    });
    expect(catalog.getLocaleLink('de')).toBeNull();
  });

  test('returns matching locale link', () => {
    let catalog = new Catalog({
      id: 'test',
      type: 'Catalog',
      stac_version: '1.1.0',
      description: 'test',
      links: [
        { rel: 'self', href: 'https://example.com', type: 'application/json' },
        { rel: 'alternate', href: 'https://example.com/de', type: 'application/json', hreflang: 'de' },
        { rel: 'alternate', href: 'https://example.com/fr', type: 'application/json', hreflang: 'fr' },
      ],
    });
    let link = catalog.getLocaleLink('de');
    expect(link).toBeInstanceOf(Link);
    expect(link.href).toBe('https://example.com/de');
  });

  test('returns null when locale is not available', () => {
    let catalog = new Catalog({
      id: 'test',
      type: 'Catalog',
      stac_version: '1.1.0',
      description: 'test',
      links: [
        { rel: 'alternate', href: 'https://example.com/de', type: 'application/json', hreflang: 'de' },
        { rel: 'alternate', href: 'https://example.com/fr', type: 'application/json', hreflang: 'fr' },
      ],
    });
    expect(catalog.getLocaleLink('es')).toBeNull();
  });

  test('uses fallback locale when requested locale not available', () => {
    let catalog = new Catalog({
      id: 'test',
      type: 'Catalog',
      stac_version: '1.1.0',
      description: 'test',
      links: [
        { rel: 'alternate', href: 'https://example.com/de', type: 'application/json', hreflang: 'de' },
        { rel: 'alternate', href: 'https://example.com/fr', type: 'application/json', hreflang: 'fr' },
      ],
    });
    let link = catalog.getLocaleLink('es', 'fr');
    expect(link).toBeInstanceOf(Link);
    expect(link.href).toBe('https://example.com/fr');
  });

  test('uses languages property when available', () => {
    let catalog = new Catalog({
      id: 'test',
      type: 'Catalog',
      stac_version: '1.1.0',
      description: 'test',
      languages: [{ code: 'en' }, { code: 'de' }],
      links: [
        { rel: 'alternate', href: 'https://example.com/en', type: 'application/json', hreflang: 'en' },
        { rel: 'alternate', href: 'https://example.com/de', type: 'application/json', hreflang: 'de' },
      ],
    });
    let link = catalog.getLocaleLink('de');
    expect(link).toBeInstanceOf(Link);
    expect(link.href).toBe('https://example.com/de');
  });
});
