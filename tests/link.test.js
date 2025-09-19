import Item from '../src/item';
import Link from '../src/link';
import fs from 'fs';

let json = JSON.parse(fs.readFileSync('./tests/examples/item.json'));
let item = new Item(json);
let link = item.links.find(link => link.rel === 'collection');
let url = 'https://example.com/20201211_223832_CS2/collection.json';

describe('constructor', () => {
  test('normal', () => {
    expect(() => new Link()).toThrow();
    expect(() => new Link(null)).toThrow();

    expect(() => new Link({})).not.toThrow();
    expect(() => new Link({}, item)).not.toThrow();
    expect(() => new Link({})).not.toThrow();
    expect(() => new Link({}, null)).not.toThrow();
    expect(() => new Link({}, item)).not.toThrow();
  });

  test('clone', () => {
    expect(link instanceof Link).toBeTruthy();
    expect(() => new Link(link)).not.toThrow();
  
    let cloned = new Link(link);
    expect(cloned.getContext()).toBe(link.getContext());
    expect(cloned.toJSON()).toEqual(link.toJSON());
  });
});

test('getContext', () => {
  expect(link.getContext()).toBe(item);
});

test('getObjectType', () => {
  expect(link.getObjectType()).toBe("Link");
});

test('getAbsoluteUrl', () => {
  expect(link.getAbsoluteUrl()).toBe(url);
});

test('is...', () => {
  expect(link.isItem()).toBeFalsy();
  expect(link.isCatalog()).toBeFalsy();
  expect(link.isCatalogLike()).toBeFalsy();
  expect(link.isCollection()).toBeFalsy();
  expect(link.isItemCollection()).toBeFalsy();
  expect(link.isCollectionCollection()).toBeFalsy();
  expect(link.isAsset()).toBeFalsy();
  expect(link.isLink()).toBeTruthy();
  expect(link.isBand()).toBeFalsy();
});

test('isPreview', () => {
  expect(link.isPreview()).toBeFalsy();
  expect((new Link({href: 'example.png', rel: 'preview'})).isPreview()).toBeTruthy();
});

test('canBrowserDisplayImage', () => {
  let link = type => (new Link({href: 'https://example.com/example', type}));

  expect(link(undefined).canBrowserDisplayImage()).toBeFalsy();
  expect(link("image/jpg").canBrowserDisplayImage()).toBeFalsy();
  expect(link("image/bmp").canBrowserDisplayImage()).toBeFalsy();
  expect(link("image/tiff").canBrowserDisplayImage()).toBeFalsy();
  expect(link("png").canBrowserDisplayImage()).toBeFalsy();
  expect(link("jpg").canBrowserDisplayImage()).toBeFalsy();
  
  expect(link("image/gif").canBrowserDisplayImage()).toBeTruthy();
  expect(link("image/jpeg").canBrowserDisplayImage()).toBeTruthy();
  expect(link("image/apng").canBrowserDisplayImage()).toBeTruthy();
  expect(link("image/png").canBrowserDisplayImage()).toBeTruthy();
  expect(link("image/webp").canBrowserDisplayImage()).toBeTruthy();
  expect(link("IMAGE/WEBP").canBrowserDisplayImage()).toBeTruthy();

  expect((new Link({href: 'https://example.com/image.jpg'})).canBrowserDisplayImage(true)).toBeTruthy();
  expect((new Link({href: 'http://example.com/image.jpg'})).canBrowserDisplayImage(true)).toBeTruthy();
  expect((new Link({href: 'HTTP://EXAMPLE.COM/IMAGE.JPEG'})).canBrowserDisplayImage(true)).toBeTruthy();
  expect((new Link({href: './image.jpg'})).canBrowserDisplayImage(true)).toBeTruthy();
  expect(link("image/jpeg").canBrowserDisplayImage(true)).toBeTruthy();

  expect((new Link({href: 'https://example.com/image.bmp'})).canBrowserDisplayImage(true)).toBeFalsy();
  expect((new Link({href: 's3://example.com/image.jpg'})).canBrowserDisplayImage(true)).toBeFalsy();
  expect(link(null).canBrowserDisplayImage(true)).toBeFalsy();
  expect(link("").canBrowserDisplayImage(true)).toBeFalsy();
  expect(link("image/jpg").canBrowserDisplayImage(true)).toBeFalsy();
});
