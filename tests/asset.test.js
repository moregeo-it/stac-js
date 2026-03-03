import Item from '../src/item';
import Asset from '../src/asset';
import Band from '../src/band';
import fs from 'fs';
import { isObject } from '../src/utils';

let json = JSON.parse(fs.readFileSync('./tests/examples/item.json'));
let item = new Item(json);
let asset = item.assets.analytic;
let itemAsset = Object.assign({}, json.assets.analytic);
delete itemAsset.href;
let def = new Asset(itemAsset, "analytic", item);
let url = 'https://example.com/20201211_223832_CS2/20201211_223832_CS2_analytic.tif';

describe('constructor', () => {
  test('normal', () => {
    expect(() => new Asset()).toThrow();
    expect(() => new Asset(null, "key", item)).toThrow();

    expect(() => new Asset({})).not.toThrow();
    expect(() => new Asset({}, null, item)).not.toThrow();
    expect(() => new Asset({}, "key")).not.toThrow();
    expect(() => new Asset({}, "key", null)).not.toThrow();
    expect(() => new Asset({}, "key", item)).not.toThrow();

    expect(() => new Asset(itemAsset)).not.toThrow();
  });

  test('clone', () => {
    expect(asset instanceof Asset).toBeTruthy();
    expect(() => new Asset(asset)).not.toThrow();
  
    let cloned = new Asset(asset);
    expect(cloned.getContext()).toBe(asset.getContext());
    expect(cloned.getKey()).toBe(asset.getKey());
    expect(cloned.toJSON()).toEqual(asset.toJSON());
  });
});

test('getAbsoluteUrl', () => {
  expect(asset.getAbsoluteUrl()).toBe(url);
  expect(def.getAbsoluteUrl()).toBeNull();
});

test('is...', () => {
  expect(asset.isItem()).toBeFalsy();
  expect(asset.isCatalog()).toBeFalsy();
  expect(asset.isCatalogLike()).toBeFalsy();
  expect(asset.isCollection()).toBeFalsy();
  expect(asset.isItemCollection()).toBeFalsy();
  expect(asset.isCollectionCollection()).toBeFalsy();
  expect(asset.isLink()).toBeFalsy();
  expect(asset.isAsset()).toBeTruthy();
  expect(asset.isBand()).toBeFalsy();
  expect(def.isAsset()).toBeTruthy();
});

test('isPreview', () => {
  expect(asset.isPreview()).toBeFalsy();
  expect((new Asset({href: 'example.png', roles: ['abc', 'overview']}, 'xxx')).isPreview()).toBeTruthy();
  expect((new Asset({href: 'example.png', roles: ['thumbnail']}, 'xxx')).isPreview()).toBeTruthy();
  expect((new Asset({href: 'example.png'}, 'overview')).isPreview()).toBeTruthy();
  expect((new Asset({href: 'example.png'}, 'thumbnail')).isPreview()).toBeTruthy();
});

test('toJSON', () => {
  expect(asset.toJSON()).toEqual(json.assets.analytic);
  expect(def.toJSON()).toEqual(itemAsset);
});

test('getKey', () => {
  expect(asset.getKey()).toBe("analytic");
  expect(def.getKey()).toBe("analytic");
});

test('getContext', () => {
  expect(asset.getContext()).toBe(item);
  expect(def.getContext()).toBe(item);
});

test('getObjectType', () => {
  expect(asset.getObjectType()).toBe("Asset");
  expect(def.getObjectType()).toBe("Asset");
});

test('getMetadata', () => {
  // undefined
  expect(asset.getMetadata("foo")).not.toBeDefined();
  // Get from asset
  expect(asset.getMetadata("roles")).toEqual(["data"]);
  // Get from item properties
  expect(asset.getMetadata("proj:code")).toBe("EPSG:32659");

  expect(def.getMetadata("proj:code")).toBe("EPSG:32659");
});

test('alternate assets', () => {
  let json2 = JSON.parse(fs.readFileSync('./tests/examples/item-cdse.json'));
  let item2 = new Item(json2);
  let asset = item2.assets.B01_60m;
  let altAsset = asset.alternate.s3;
  // Check container asset
  expect(asset.getMetadata("alternate:name")).toBe("HTTPS");
  // Check alternate asset support
  expect(altAsset instanceof Asset).toBeTruthy();
  // Check alternate asset metadata, not retrieved from container asset
  expect(altAsset.getMetadata("alternate:name")).toBe("S3");
  // Get metadata from container asset of not set in alternate asset
  expect(altAsset.getMetadata("nodata")).toBe(0);
});

test('getAbsoluteUrl', () => {
  expect(asset.getAbsoluteUrl()).toBe("https://example.com/20201211_223832_CS2/20201211_223832_CS2_analytic.tif");
  expect(def.getAbsoluteUrl()).toBeNull();
});

test('isDefinition', () => {
  expect(asset.isDefinition()).toBeFalsy();
  expect(def.isDefinition()).toBeTruthy();
});

test('isType', () => {
  expect(asset.isType("image/tiff")).toBeFalsy();
  expect(asset.isType("image/tiff; application=geotiff; profile=cloud-optimized")).toBeTruthy();
  expect(def.isType("image/tiff; application=geotiff; profile=cloud-optimized")).toBeTruthy();
});

test('isHTTP', () => {
  expect(asset.isHTTP()).toBeTruthy();
  expect(def.isHTTP()).toBeFalsy();
});

test('getBands', () => {
  expect(asset.getBands().every(band => band instanceof Band)).toBeTruthy();
  expect(asset.getBands().map(band => band.toJSON())).toEqual(asset.bands.map(band => band.toJSON()));

  expect(def.getBands().every(band => band instanceof Band)).toBeTruthy();
  expect(def.getBands().map(band => band.toJSON())).toEqual(asset.bands.map(band => band.toJSON()));
});

test('hasRole', () => {
  expect(def.hasRole("data")).toBeTruthy();
  expect(asset.hasRole("data")).toBeTruthy();
  expect(asset.hasRole(["data", "foo"])).toBeTruthy();
  expect(def.hasRole("foo")).toBeFalsy();
  expect(asset.hasRole("foo")).toBeFalsy();
  expect(asset.hasRole(["bar"])).toBeFalsy();
});

test('findBand', () => {
  let b1 = { name: "b1" };
  let b2 = { name: "b2", "eo:common_name": "blue" };
  let b3 = { "eo:common_name": "red" };
  let bands = [b1, b2, b3];
  let asset = new Asset({
    "href": "ex.tif",
    "bands": bands
  }, "test");
  let b1i = new Band(b1, 0, asset);
  let b2i = new Band(b2, 1, asset);
  let b3i = new Band(b3, 2, asset);

  expect(asset.findBand("b1")).toEqual(b1i);
  expect(asset.findBand("b2")).toEqual(b2i);
  expect(asset.findBand("blue", "eo:common_name")).toEqual(b2i);
  expect(asset.findBand("red", "eo:common_name")).toEqual(b3i);
  expect(asset.findBand(["foo", "red", "bar"], "eo:common_name")).toEqual(b3i);

  expect(asset.findBand("green", "eo:common_name")).toBeNull();
  expect(asset.findBand("b1", "eo:common_name")).toBeNull();
  expect(asset.findBand("red")).toBeNull();
  expect(asset.findBand("b3")).toBeNull();
});

test('findVisualBands', () => {
  let getBand = name => {
    let index = asset.bands.findIndex(b => b['eo:common_name'] === name);
    let band = asset.bands[index];
    return new Band(band, index, asset);
  };
  expect(asset.findVisualBands()).toEqual({
    red: getBand('red'),
    green: getBand('green'),
    blue: getBand('blue')
  });
});

describe('getMinMaxValues', () => {
  test('bands -> statistics', () => {
    let asset = new Asset({
      "bands": [{
        "statistics": {
          "minimum": -5,
          "maximum": 5,
          "mean": 0
        },
        "data_type": "uint8"
      }]
    }, "test");
    let obj = asset.getBand(0).getMinMaxValues();
    expect(isObject(obj)).toBeTruthy();
    expect(obj.minimum).toBe(-5);
    expect(obj.maximum).toBe(5);
    expect(obj.mean).not.toBeDefined();

    let asset2 = new Asset({
      "bands": [{}]
    }, "test");
    let obj2 = asset2.getBand(0).getMinMaxValues();
    expect(isObject(obj2)).toBeTruthy();
    expect(obj2.minimum).toBeNull();
    expect(obj2.maximum).toBeNull();
    expect(obj2.mean).not.toBeDefined();
  });

  test('classification:classes', () => {
    let asset = new Asset({
      "classification:classes": [
        {value: -1},
        {value: 0},
        {value: 1},
        {value: 2}
      ]
    }, "test");
    let obj = asset.getMinMaxValues();
    expect(isObject(obj)).toBeTruthy();
    expect(obj.minimum).toBe(-1);
    expect(obj.maximum).toBe(2);
  });

  test('data_type', () => {
    let asset = new Asset({
      "data_type": "uint8"
    }, "test");
    let obj = asset.getMinMaxValues();
    expect(isObject(obj)).toBeTruthy();
    expect(obj.minimum).toBe(0);
    expect(obj.maximum).toBe(255);
  });

  test('classification:classes', () => {
    let asset = new Asset({
      "file:values": [
        {values: [1,2]},
        {values: [0]},
        {values: [-1]}
      ]
    }, "test");
    let obj = asset.getMinMaxValues();
    expect(isObject(obj)).toBeTruthy();
    expect(obj.minimum).toBe(-1);
    expect(obj.maximum).toBe(2);
  });

  test('empty', () => {
    let asset = new Asset({"href": "example.jpg"}, "test");
    let obj = asset.getMinMaxValues();
    expect(isObject(obj)).toBeTruthy();
    expect(obj.minimum).toBeNull();
    expect(obj.maximum).toBeNull();
  });
});

describe('getNoDataValues', () => {
  test('asset', () => {
    let asset = new Asset({
      "nodata": "nan"
    }, "test");
    expect(asset.getNoDataValues()).toEqual([NaN]);
  });

  test('bands', () => {
    let asset = new Asset({
      "bands": [{
        "nodata": "nan"
      },{
        "nodata": 0
      },{
        "name": "b3"
      }]
    }, "test");

    expect(asset.getNoDataValues()).toEqual([]);
    expect(asset.getBand(0).getNoDataValues()).toEqual([NaN]);
    expect(asset.getBand(1).getNoDataValues()).toEqual([0]);
    expect(asset.getBand(2).getNoDataValues()).toEqual([]);
  });

  test('classification:classes', () => {
    let asset = new Asset({
      "classification:classes": [{
        value: 0,
        nodata: true
      },{
        value: 1
      },]
    }, "test");

    expect(asset.getNoDataValues()).toEqual([0]);
  });

  test('file:nodata', () => {
    let asset = new Asset({
      "file:nodata": [-1, -3]
    }, "test");
    expect(asset.getNoDataValues()).toEqual([-1, -3]);
  });
});

test('canBrowserDisplayImage', () => {
  expect(item.assets.thumbnail.canBrowserDisplayImage()).toBeTruthy();
  expect(item.assets.analytic.canBrowserDisplayImage()).toBeFalsy();
});
