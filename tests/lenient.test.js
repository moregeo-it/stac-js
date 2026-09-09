import Asset from '../src/asset';
import Band from '../src/band';
import Catalog from '../src/catalog';
import Collection from '../src/collection';
import Item from '../src/item';
import ItemCollection from '../src/itemcollection';
import CollectionCollection from '../src/collectioncollection';
import ChildrenCollection from '../src/childrencollection';
import Link from '../src/link';

// Malformed nested entries (non-objects) must not fail the construction of the
// containing entity. They are skipped during conversion so that the converted
// containers only ever contain proper stac-js objects.

const validAsset = { href: 'https://example.com/thumb.jpg', type: 'image/jpeg', roles: ['thumbnail'] };

function createItem(extra) {
  return new Item(
    Object.assign(
      {
        type: 'Feature',
        stac_version: '1.1.0',
        id: 'item',
        geometry: null,
        properties: { datetime: null },
        links: [],
        assets: {},
      },
      extra,
    ),
    'https://example.com/item',
  );
}

describe('malformed assets', () => {
  let item = createItem({ assets: { good: validAsset, bad: 'not an asset', worse: null, worst: 42 } });

  test('does not throw and skips malformed entries', () => {
    let assets = item.getAssets();
    expect(assets.length).toBe(1);
    expect(assets[0]).toBeInstanceOf(Asset);
    expect(assets[0].getKey()).toBe('good');
  });

  test('getAsset returns null for malformed entries', () => {
    expect(item.getAsset('good')).toBeInstanceOf(Asset);
    expect(item.getAsset('bad')).toBeNull();
    expect(item.getAsset('worse')).toBeNull();
  });

  test('toJSON only contains the converted assets', () => {
    expect(item.toJSON().assets).toEqual({ good: validAsset });
  });
});

describe('malformed bands', () => {
  let asset = new Asset(
    Object.assign({ bands: [{ name: 'red' }, 'not a band', null] }, validAsset),
    'good',
    createItem(),
  );

  test('does not throw and skips malformed entries', () => {
    let bands = asset.getBands();
    expect(bands.length).toBe(1);
    expect(bands[0]).toBeInstanceOf(Band);
    expect(bands[0].name).toBe('red');
  });
});

describe('malformed links', () => {
  let catalog = new Catalog({
    id: 'test',
    type: 'Catalog',
    stac_version: '1.1.0',
    description: 'test',
    links: [{ rel: 'self', href: 'https://example.com' }, 'not a link', null, 42],
  });

  test('does not throw and skips malformed entries', () => {
    expect(catalog.links.length).toBe(1);
    expect(catalog.links[0]).toBeInstanceOf(Link);
    let links = catalog.getLinks();
    expect(links.length).toBe(1);
    expect(links[0].rel).toBe('self');
  });
});

describe('malformed entries in API collections', () => {
  test('ItemCollection', () => {
    let ic = new ItemCollection({
      type: 'FeatureCollection',
      features: [createItem().toJSON(), 'not an item', null],
      links: [],
    });
    let all = ic.getAll();
    expect(all.length).toBe(1);
    expect(all[0]).toBeInstanceOf(Item);
    expect(ic.getBoundingBoxes()).toEqual([null]);
  });

  test('ItemCollection with malformed features container', () => {
    let ic = new ItemCollection({ type: 'FeatureCollection', features: 'invalid', links: [] });
    expect(ic.getAll()).toEqual([]);
  });

  test('CollectionCollection', () => {
    let cc = new CollectionCollection({
      collections: [{ id: 'col', type: 'Collection', stac_version: '1.1.0', description: 'test', links: [] }, 42, null],
      links: [],
    });
    let all = cc.getAll();
    expect(all.length).toBe(1);
    expect(all[0]).toBeInstanceOf(Collection);
  });

  test('ChildrenCollection', () => {
    let children = new ChildrenCollection({
      children: [
        { id: 'cat', type: 'Catalog', stac_version: '1.1.0', description: 'test', links: [] },
        { id: 'col', type: 'Collection', stac_version: '1.1.0', description: 'test', links: [] },
        'not a child',
        null,
      ],
      links: [],
    });
    let all = children.getAll();
    expect(all.length).toBe(2);
    expect(all[0]).toBeInstanceOf(Catalog);
    expect(all[1]).toBeInstanceOf(Collection);
    expect(children.toGeoJSON()).toEqual({ type: 'FeatureCollection', features: [] });
  });
});
