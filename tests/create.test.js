import create from '../src/index';
import Catalog from '../src/catalog';
import ChildrenCollection from '../src/childrencollection';
import Collection from '../src/collection';
import CollectionCollection from '../src/collectioncollection';
import Item from '../src/item';
import ItemCollection from '../src/itemcollection';
import fs from 'fs';

let catalogJson = JSON.parse(fs.readFileSync('./tests/examples/catalog.json'));
let collectionJson = JSON.parse(fs.readFileSync('./tests/examples/collection.json'));
let itemJson = JSON.parse(fs.readFileSync('./tests/examples/item.json'));
let itemS2OldJson = JSON.parse(fs.readFileSync('./tests/examples/item-s2-old.json'));
let apiJson = JSON.parse(fs.readFileSync('./tests/examples/api.json'));

describe('create', () => {
  test('returns Item for Feature type', () => {
    let result = create(itemJson, false);
    expect(result).toBeInstanceOf(Item);
    expect(result.type).toBe('Feature');
  });

  test('returns ItemCollection for FeatureCollection type', () => {
    let data = {
      type: 'FeatureCollection',
      features: [itemJson],
      links: [],
    };
    let result = create(data, false);
    expect(result).toBeInstanceOf(ItemCollection);
  });

  test('returns Collection for Collection type', () => {
    let result = create(collectionJson, false);
    expect(result).toBeInstanceOf(Collection);
    expect(result.type).toBe('Collection');
  });

  test('returns Collection for object without type but with extent and license', () => {
    let data = {
      id: 'test',
      stac_version: '1.1.0',
      description: 'test',
      extent: { spatial: {}, temporal: {} },
      license: 'MIT',
      links: [],
    };
    let result = create(data, false);
    expect(result).toBeInstanceOf(Collection);
  });

  test('returns CollectionCollection for object without type but with collections array', () => {
    let data = {
      collections: [collectionJson],
      links: [],
    };
    let result = create(data, false);
    expect(result).toBeInstanceOf(CollectionCollection);
  });

  test('returns ChildrenCollection for object without type but with children array', () => {
    let data = {
      children: [catalogJson, collectionJson],
      links: [],
    };
    let result = create(data, false);
    expect(result).toBeInstanceOf(ChildrenCollection);
  });

  test('returns Catalog for Catalog type', () => {
    let result = create(catalogJson, false);
    expect(result).toBeInstanceOf(Catalog);
    expect(result.type).toBe('Catalog');
  });

  test('returns Catalog as fallback for unknown data', () => {
    let data = {
      id: 'test',
      stac_version: '1.1.0',
      description: 'test',
      links: [],
    };
    let result = create(data, false);
    expect(result).toBeInstanceOf(Catalog);
  });

  test('migrates data by default, keep version number', () => {
    let result = create(itemS2OldJson);
    expect(result).toBeInstanceOf(Item);
    expect(result.stac_version).toBe('1.0.0-beta.2');
  });

  test('migrates data and updates version number', () => {
    let result = create(itemS2OldJson, true, true);
    expect(result).toBeInstanceOf(Item);
    expect(result.stac_version).toBe('1.1.0');
  });

  test('skips migration when migrate is false', () => {
    let data = JSON.parse(JSON.stringify(itemS2OldJson));
    let originalVersion = data.stac_version;
    let result = create(data, false);
    expect(result).toBeInstanceOf(Item);
    expect(result.stac_version).toBe(originalVersion);
  });

  test('updates version number when updateVersionNumber is true', () => {
    let result = create(itemS2OldJson, true, true);
    expect(result).toBeInstanceOf(Item);
    expect(result.stac_version).toBe('1.1.0');
  });

  test('does not update version number by default', () => {
    let data = JSON.parse(JSON.stringify(itemS2OldJson));
    let originalVersion = data.stac_version;
    let result = create(data, true, false);
    expect(result).toBeInstanceOf(Item);
    // Migration runs but version number stays as original
    expect(result.stac_version).toBe(originalVersion);
  });

  test('returns Catalog for API root', () => {
    let result = create(apiJson, false);
    expect(result).toBeInstanceOf(Catalog);
  });
});

describe('create with list responses and edge cases', () => {
  const clone = (data) => JSON.parse(JSON.stringify(data));
  const catalog060 = () => ({ stac_version: '0.6.0', id: 'cat', description: 'd', links: [] });
  const collection060 = () => ({
    stac_version: '0.6.0',
    id: 'col',
    description: 'd',
    license: 'MIT',
    extent: { spatial: [-180, -90, 180, 90], temporal: ['2000-01-01T00:00:00Z', null] },
    links: [],
  });
  const withoutVersion = (data) => {
    delete data.stac_version;
    return data;
  };

  const cases = [
    ['0.6.0 Catalog without type', catalog060, Catalog],
    ['0.6.0 Collection without type', collection060, Collection],
    ['Catalog without type and stac_version', () => withoutVersion(catalog060()), Catalog],
    ['Collection without type and stac_version', () => withoutVersion(collection060()), Collection],
    ['Item without stac_version', () => withoutVersion(clone(itemJson)), Item],
    ['API root', () => clone(apiJson), Catalog],
    ['collections without type', () => ({ collections: [collection060()], links: [] }), CollectionCollection],
    [
      'collections without type, with stac_version',
      () => ({ stac_version: '1.0.0', collections: [collection060()], links: [] }),
      CollectionCollection,
    ],
    [
      'children without type',
      () => ({ children: [clone(catalogJson), clone(collectionJson)], links: [] }),
      ChildrenCollection,
    ],
    [
      'OGC API - Records collections response',
      () => ({ type: 'Collection', id: 'records', links: [], collections: [clone(collectionJson)] }),
      CollectionCollection,
    ],
    [
      'OGC API - Records children response',
      () => ({ type: 'Catalog', id: 'records', links: [], children: [clone(catalogJson)] }),
      ChildrenCollection,
    ],
    ['Catalog with stac_version and children', () => ({ ...clone(catalogJson), children: [] }), Catalog],
    ['Collection with stac_version and collections', () => ({ ...clone(collectionJson), collections: [] }), Collection],
    ['Feature without stac_version and children', () => ({ ...withoutVersion(clone(itemJson)), children: [] }), Item],
    [
      'FeatureCollection without stac_version and collections',
      () => ({ type: 'FeatureCollection', features: [], links: [], collections: [clone(collectionJson)] }),
      ItemCollection,
    ],
  ];

  describe.each([true, false])('migrate = %s', (migrate) => {
    test.each(cases)('%s', (name, data, expected) => {
      expect(create(data(), migrate)).toBeInstanceOf(expected);
    });
  });

  test('migrates the collections of a CollectionCollection', () => {
    let data = () => ({ collections: [collection060()], links: [] });
    let result = create(data());
    expect(result.collections[0]).toBeInstanceOf(Collection);
    expect(result.collections[0].extent.spatial.bbox).toEqual([[-180, -90, 180, 90]]);
    expect(result.collections[0].stac_version).toBe('0.6.0');
    expect(create(data(), true, true).collections[0].stac_version).toBe('1.1.0');
    expect(create(data(), false).collections[0].extent.spatial).toEqual([-180, -90, 180, 90]);
  });

  test('migrates the children of a ChildrenCollection', () => {
    let data = () => ({ children: [catalog060(), collection060(), null], links: [] });
    let result = create(data());
    expect(result.children.length).toBe(2);
    expect(result.children[0]).toBeInstanceOf(Catalog);
    expect(result.children[1]).toBeInstanceOf(Collection);
    expect(result.children[1].extent.spatial.bbox).toEqual([[-180, -90, 180, 90]]);
    expect(result.children[1].stac_version).toBe('0.6.0');
    expect(create(data(), true, true).children.map((child) => child.stac_version)).toEqual(['1.1.0', '1.1.0']);
    // Without migration, the collection lacks a type and is treated as a catalog
    expect(create(data(), false).children[1]).toBeInstanceOf(Catalog);
  });

  test('does not add Collection fields to an OGC API - Records collections response', () => {
    let result = create({ type: 'Collection', id: 'records', links: [], collections: [clone(collectionJson)] });
    expect(result.license).toBeUndefined();
    expect(result.extent).toBeUndefined();
  });
});
