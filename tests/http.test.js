import { resolveSelfUrl, toAbsolute } from '../src/http';

test('toAbsolute', () => {
  expect(toAbsolute('./example.gif', 'https://stac.example/catalog.json')).toBe('https://stac.example/example.gif');
  expect(toAbsolute('./', 'https://stac.example/catalog.json')).toBe('https://stac.example/');
  expect(toAbsolute('/api/example.gif', 'https://stac.example/api')).toBe('https://stac.example/api/example.gif');
  expect(toAbsolute('./example.gif', 'https://stac.example/api')).toBe('https://stac.example/example.gif');
  expect(toAbsolute('./example.gif', 'https://stac.example/api/')).toBe('https://stac.example/api/example.gif');
  expect(toAbsolute('./example.gif', 'https://stac.example/catalog.json/')).toBe(
    'https://stac.example/catalog.json/example.gif',
  );
  expect(toAbsolute('http://y.de/test', 'https://stac.example/catalog.json')).toBe('http://y.de/test');
  // todo
});

test('resolveSelfUrl', () => {
  const base = 'https://stac.example/collections/abc/items?limit=10';
  const data = (href) => ({
    links: [
      { rel: 'root', href: '/' },
      { rel: 'self', href },
    ],
  });
  expect(resolveSelfUrl(data('./items/1'), base)).toBe('https://stac.example/collections/abc/items/1');
  expect(resolveSelfUrl(data('items/1'), 'https://stac.example/collections/abc')).toBe(
    'https://stac.example/collections/items/1',
  );
  expect(resolveSelfUrl(data('items/1'), 'https://stac.example/collections/abc/')).toBe(
    'https://stac.example/collections/abc/items/1',
  );
  expect(resolveSelfUrl(data('https://other.example/1'), base)).toBe('https://other.example/1');
  expect(resolveSelfUrl(data('./items/1'), null)).toBe('items/1');
  expect(resolveSelfUrl({ links: [] }, base)).toBeNull();
  expect(resolveSelfUrl({}, base)).toBeNull();
  expect(resolveSelfUrl(null, base)).toBeNull();
});
