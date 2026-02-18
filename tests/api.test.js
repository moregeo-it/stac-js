import Catalog from '../src/catalog';
import fs from 'fs';

let json = JSON.parse(fs.readFileSync('./tests/examples/api.json'));
let c = new Catalog(json);

test('toJSON', () => {
  expect(c.toJSON()).toEqual(json);
});

test('Basics', () => {
  expect(c.id).toBe("api");
  expect(c.getMetadata("id")).toBe("api");
  expect(c.getAbsoluteUrl()).toBe("https://example.com");
});

test('is...', () => {
  expect(c.isItem()).toBeFalsy();
  expect(c.isCatalog()).toBeTruthy();
  expect(c.isCatalogLike()).toBeTruthy();
  expect(c.isCollection()).toBeFalsy();
  expect(c.isCollectionCollection()).toBeFalsy();
  expect(c.isAsset()).toBeFalsy();
  expect(c.isLink()).toBeFalsy();
});

test('getSearchLink', () => {
  let link = c.getSearchLink();
  expect(link).not.toBeNull();
  expect(link.href).toBe("https://example.com/search");
  expect(link.rel).toBe("search");
  expect(link.type).toBe("application/geo+json");
  expect(link.method).toBe("POST");
});

test('getApiCollectionsLink', () => {
  let link = c.getApiCollectionsLink();
  expect(link).not.toBeNull();
  expect(link.href).toBe("https://example.com/collections");
  expect(link.rel).toBe("data");
  expect(link.type).toBe("application/json");
});

test('getApiItemsLink', () => {
  expect(c.getApiItemsLink()).toBeNull();
});

test('getChildLinks', () => {
  let childs = c.getChildLinks();
  expect(Array.isArray(childs)).toBeTruthy();
  expect(c.getChildLinks().length).toBe(6);
  expect(childs.every(child => child && typeof child === 'object' && child.href && child.type && child.rel === 'child')).toBeTruthy();
});

test('getItemLinks', () => {
  let items = c.getItemLinks();
  expect(Array.isArray(items)).toBeTruthy();
  expect(items.length).toBe(0);
  expect(items.every(item => item && typeof item === 'object' && item.href && item.type && item.rel === 'item')).toBeTruthy();
});
