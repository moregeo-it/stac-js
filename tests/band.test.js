import Item from '../src/item';
import Asset from '../src/asset';
import Band from '../src/band';
import fs from 'fs';
import { isObject } from '../src/utils';

let json = JSON.parse(fs.readFileSync('./tests/examples/item.json'));
let item = new Item(json);
let asset = new Asset(item.assets.analytic, 'analytic', item);
let band = asset.bands[0];

describe('constructor', () => {
  test('normal', () => {
    expect(() => new Band()).toThrow();
    expect(() => new Band(null, 0, asset)).toThrow();

    expect(() => new Band({})).not.toThrow();
    expect(() => new Band({}, null, asset)).not.toThrow();
    expect(() => new Band({}, 0)).not.toThrow();
    expect(() => new Band({}, 0, null)).not.toThrow();
    expect(() => new Band({}, 0, asset)).not.toThrow();

    expect(() => new Band(band)).not.toThrow();
  });

  test('clone', () => {
    expect(band instanceof Band).toBeTruthy();
    expect(() => new Band(band)).not.toThrow();

    let cloned = new Band(band);
    expect(cloned.getContext()).toBe(band.getContext());
    expect(cloned.getIndex()).toBe(band.getIndex());
    expect(cloned.toJSON()).toEqual(band.toJSON());
  });
});

test('is...', () => {
  expect(band.isItem).toBeFalsy();
  expect(band.isCatalog).toBeFalsy();
  expect(band.isCatalogLike).toBeFalsy();
  expect(band.isCollection).toBeFalsy();
  expect(band.isItemCollection).toBeFalsy();
  expect(band.isCollectionCollection).toBeFalsy();
  expect(band.isLink).toBeFalsy();
  expect(band.isAsset).toBeFalsy();
  expect(band.isBand).toBeTruthy();
  expect(band.isSTAC).toBeFalsy();
  expect(band.isApiCollection).toBeFalsy();
  expect(band.isReference).toBeFalsy();
});

test('toJSON', () => {
  expect(band.toJSON()).toEqual(json.assets.analytic.bands[0]);
});

test('getIndex', () => {
  expect(band.getIndex()).toBe(0);
});

test('getContext', () => {
  expect(band.getContext()).toBe(asset);
});

test('getObjectType', () => {
  expect(band.getObjectType()).toBe('Band');
});

test('getMetadata', () => {
  // undefined
  expect(band.getMetadata('foo')).not.toBeDefined();
  // Get from band
  expect(band.getMetadata('name')).toBe('band1');
  // Get from asset
  expect(band.getMetadata('title')).toBe('4-Band Analytic');
  // Get from item properties
  expect(band.getMetadata('sci:doi')).toBe('10.5061/dryad.s2v81.2/27.2');
});

describe('getStatistics', () => {
  test('bands -> statistics', () => {
    let band = new Band(
      {
        statistics: {
          minimum: -5,
          maximum: 5,
          mean: 0,
        },
        data_type: 'uint8',
      },
      'test',
    );
    let obj = band.getStatistics();
    expect(isObject(obj)).toBeTruthy();
    expect(obj.minimum).toBe(-5);
    expect(obj.maximum).toBe(5);
    expect(obj.mean).toBe(0);
  });

  test('classification:classes', () => {
    let band = new Band(
      {
        'classification:classes': [{ value: -1 }, { value: 0 }, { value: 1 }, { value: 2 }],
      },
      0,
    );
    let obj = band.getStatistics();
    expect(isObject(obj)).toBeTruthy();
    expect(obj.minimum).toBe(-1);
    expect(obj.maximum).toBe(2);
  });

  test('empty', () => {
    let band = new Band({ name: 'b1' }, 0);
    let obj = band.getStatistics();
    expect(isObject(obj)).toBeTruthy();
    expect(obj.minimum).toBeNull();
    expect(obj.maximum).toBeNull();
    expect(obj.mean).toBeNull();
    expect(obj.stddev).toBeNull();
  });
});

describe('getNoDataValues', () => {
  test('bands', () => {
    let b1 = new Band({ nodata: 'nan' }, 0);
    expect(b1.getNoDataValues()).toEqual([NaN]);

    let b2 = new Band({ nodata: 0 }, 0);
    expect(b2.getNoDataValues()).toEqual([0]);

    let b3 = new Band({ name: 'b3' }, 0);
    expect(b3.getNoDataValues()).toEqual([]);
  });

  test('classification:classes', () => {
    let band = new Band(
      {
        'classification:classes': [
          {
            value: 0,
          },
          {
            value: 1,
            nodata: true,
          },
        ],
      },
      0,
    );

    expect(band.getNoDataValues()).toEqual([1]);
  });

  test('file:nodata', () => {
    let band = new Band(
      {
        'file:nodata': [-1, -3],
      },
      0,
    );
    expect(band.getNoDataValues()).toEqual([-1, -3]);
  });
});
