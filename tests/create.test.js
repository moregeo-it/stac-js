import create from '../src/index';
import Catalog from '../src/catalog';
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
