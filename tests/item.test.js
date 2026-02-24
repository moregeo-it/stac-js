import Item from '../src/item';
import fs from 'fs';
import Link from '../src/link';
import Asset from '../src/asset';
import create from '../src/index';

let json = JSON.parse(fs.readFileSync('./tests/examples/item.json'));
let item = new Item(json);
let bbox = [172.91,1.34,172.95,1.36];
let dtDate = new Date(Date.UTC(2020, 11, 14, 18, 2, 31));
let dtStartDate = new Date(Date.UTC(2020, 11, 14, 18, 1, 31));
let dtEndDate = new Date(Date.UTC(2020, 11, 14, 18, 3, 31));
let collectionLink = item.links.find(link => link.rel === 'collection');
let rootLink = item.links.find(link => link.rel === 'root');
let parentLink = item.links.find(link => link.rel === 'parent');

let json2 = JSON.parse(fs.readFileSync('./tests/examples/item-s2.json'));
let item2 = new Item(json2);
let dtStr2 = "2023-02-27T14:47:44Z";
let dtDate2 = new Date(Date.UTC(2023, 1, 27, 14, 47, 44));

let url = "https://example.com/20201211_223832_CS2/item.json";

let json2Old = JSON.parse(fs.readFileSync('./tests/examples/item-s2-old.json'));
let item2Old = create(json2Old, true, true);

describe('Migration', () => {
  test('stac_version', () => {
    expect(item2Old.stac_version).toBe(item2.stac_version);
  });
  test('stac_extensions', () => {
    expect(item2Old.stac_extensions).toEqual(item2.stac_extensions);
  });
  test('proj:epsg -> proj:code', () => {
    expect(item2Old.getMetadata('proj:code')).toBe(item2.getMetadata('proj:code'));
  });
  test('eo:bands -> bands', () => {
    expect(item2Old.getAsset('overview').getBand(0)).toEqual(item2.getAsset('overview').getBand(0));
  });
});

test('Basics', () => {
  expect(item.id).toBe("20201211_223832_CS2");
  expect(item.getMetadata("id")).toBeUndefined();
  expect(item.getAbsoluteUrl()).toBe(url);
});

test('get/setAbsoluteUrl', () => {
  let item2 = new Item(json);
  expect(item2.getAbsoluteUrl()).toBe(url);
  let url2 = "https://example.com/20201211_223832_CS2/item2.json";
  item2.setAbsoluteUrl(url2)
  expect(item2.getAbsoluteUrl()).toBe(url2);
});

test('is...', () => {
  expect(item.isItem()).toBeTruthy();
  expect(item.isCatalog()).toBeFalsy();
  expect(item.isCatalogLike()).toBeFalsy();
  expect(item.isCollection()).toBeFalsy();
  expect(item.isItemCollection()).toBeFalsy();
  expect(item.isCollectionCollection()).toBeFalsy();
  expect(item.isAsset()).toBeFalsy();
  expect(item.isLink()).toBeFalsy();
  expect(item.isBand()).toBeFalsy();
});

test('getObjectType', () => {
  expect(item.getObjectType()).toBe("Item");
});

test('toJSON', () => {
  expect(item.toJSON()).toEqual(json);
});

test('toGeoJSON', () => {
  expect(item.toGeoJSON()).toEqual(json);
});

test('getBoundingBox', () => {
  expect(item.getBoundingBox()).toEqual(bbox);
});

test('getBoundingBoxes', () => {
  expect(item.getBoundingBoxes()).toEqual([bbox]);
});

test('datetime', () => {
  expect(item.properties.datetime).toBeNull();
  expect(item2.properties.datetime).toBe(dtStr2);
});

test('getMetadata', () => {
  expect(item.getMetadata("datetime")).toBeNull();
  expect(item2.getMetadata("datetime")).toBe(dtStr2);
});

test('getDateTime', () => {
  expect(item.getDateTime()).toEqual(dtDate);
  expect(item2.getDateTime()).toEqual(dtDate2);
});

test('getTemporalExtent', () => {
  expect(item.getTemporalExtent()).toEqual([dtStartDate, dtEndDate]);
  expect(item2.getTemporalExtent()).toEqual([dtDate2, dtDate2]);
});

test('getIcons', () => {
  expect(item.getIcons()).toEqual([]);
  let icons = item2.getIcons();

  expect(icons.length).toBe(1);
  expect(icons[0].href).toEqual("./icon.png");
  expect(icons[0].rel).toEqual("icon");
  expect(icons[0].type).toEqual("image/png");
});

test('getBands', () => {
  expect(item.getBands()).toEqual([]);
  expect(item2.getBands()).toEqual([]);
});

test('getThumbnails', () => {
  expect(item.getThumbnails()).toEqual([new Asset(json.assets.thumbnail, "thumbnail", item)]);
  expect(item2.getThumbnails()).toEqual([new Asset(json2.assets.thumbnail, "thumbnail", item2)]);
});

test('getAsset', () => {
  expect(item.getAsset("test")).toBeNull();
  expect(item.getAsset("thumbnail")).toEqual(new Asset(json.assets.thumbnail, "thumbnail", item));
});

test('getAssets', () => {
  expect(item.getAssets()).toEqual(Object.values(item.assets));
});

test('supportsExtension', () => {
  expect(item.supportsExtension("https://stac-extensions.github.io/eo/*/schema.json")).toBeTruthy();
  expect(item.supportsExtension("https://stac-extensions.github.io/scientific/v1.*/schema.json")).toBeTruthy();
  expect(item.supportsExtension("https://stac-extensions.github.io/remote-data/v1.0.0/schema.json")).toBeTruthy();
  expect(item.supportsExtension("https://stac-extensions.github.io/label/v1.*/schema.json")).toBeFalsy();
  expect(item.supportsExtension("eo")).toBeFalsy();
});

describe('links', () => {
  test('getLinkWithRel > FOUND', () => {
    let link = item.getLinkWithRel('collection');
    expect(link instanceof Link).toBeTruthy();
    expect(link).toEqual(collectionLink);
  });
  test('getLinkWithRel > NOT FOUND', () => {
    expect(item.getLinkWithRel('foo')).toBeNull();
  });
  test('getCollectionLink', () => {
    let link = item.getCollectionLink();
    expect(link instanceof Link).toBeTruthy();
    expect(link).toEqual(collectionLink);
  });
  test('getCollectionLink', () => {
    let links = item.getLinksWithOtherRels(['self', 'parent', 'root']);
    expect(Array.isArray(links)).toBeTruthy();
    expect(links.length).toBe(1);
    expect(links[0] instanceof Link).toBeTruthy();
    expect(links[0]).toEqual(collectionLink);
  });
  test('getRootLink', () => {
    let link = item.getRootLink();
    expect(link instanceof Link).toBeTruthy();
    expect(link).toEqual(rootLink);
  });
  test('getParentLink', () => {
    let link = item.getParentLink();
    expect(link instanceof Link).toBeTruthy();
    expect(link).toEqual(parentLink);
  });
});

describe('rankGeoFiles', () => {
  test('default', () => {
    let ranks = item.rankGeoFiles('geotiff');
    expect(ranks.length).toBe(3);
    expect(ranks.map(r => r.asset.getKey())).toEqual(["visual", "analytic", "udm"]);
    expect(ranks.map(r => r.score)).toEqual([5, 4, 0]);
  });

  test('not httpOnly', () => {
    let ranks = item.rankGeoFiles('geotiff', false);
    expect(ranks.length).toBe(4);
    expect(ranks.map(r => r.asset.getKey())).toEqual(["visual", "analytic", "s3", "udm"]);
    expect(ranks.map(r => r.score)).toEqual([5, 4, 3, 0]);
  });

  test('optimizedOnly', () => {
    let ranks = item.rankGeoFiles('geotiff', true, true);
    expect(ranks.length).toBe(2);
    expect(ranks.map(r => r.asset.getKey())).toEqual(["visual", "analytic"]);
    expect(ranks.map(r => r.score)).toEqual([3, 2]);
  });
  
  test('with different roles', () => {
    let ranks = item.rankGeoFiles('geotiff', true, false, {analytic: 5});
    expect(ranks.length).toBe(3);
    expect(ranks.map(r => r.asset.getKey())).toEqual(["analytic", "visual", "udm"]);
    expect(ranks.map(r => r.score)).toEqual([8, 3, 0]);
  });
  
  test('with callback', () => {
    let ranks = item.rankGeoFiles('geotiff', true, false, null, asset => Array.isArray(asset.bands) ? 5 : -5);
    expect(ranks.length).toBe(3);
    expect(ranks.map(r => r.asset.getKey())).toEqual(["visual", "analytic", "udm"]);
    expect(ranks.map(r => r.score)).toEqual([10, 9, -5]);
  });

  test('getDefaultGeoFile', () => {
    let asset = item.getDefaultGeoFile('geotiff');
    expect(asset).not.toBeNull();
    expect(asset.getKey()).toEqual("visual");
    expect(asset.href).toEqual("./20201211_223832_CS2.tif");
    expect(asset.getAbsoluteUrl()).toEqual("https://example.com/20201211_223832_CS2/20201211_223832_CS2.tif");
  });
});

describe('findVisualAssets', () => {

  test('item (not found)', () => {
    expect(item.findVisualAssets()).toBeNull();
  });

  test('item-s2 (found)', () => {  
    let assets = item2.findVisualAssets();
    expect(assets).not.toBeNull();
    expect(assets.red.getKey()).toBe("B04");
    expect(assets.blue.getKey()).toBe("B02");
    expect(assets.green.getKey()).toBe("B03");
  });

  test('item-s2-old (found)', () => {  
    let assets = item2Old.findVisualAssets();
    expect(assets).not.toBeNull();
    expect(assets.red.getKey()).toBe("B04");
    expect(assets.blue.getKey()).toBe("B02");
    expect(assets.green.getKey()).toBe("B03");
  });
    
});
