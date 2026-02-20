import { toAbsolute } from '../src/http';

test('toAbsolute', () => {
  expect(toAbsolute("./example.gif", "https://stac.example/catalog.json")).toBe("https://stac.example/example.gif");
  expect(toAbsolute("./", "https://stac.example/catalog.json")).toBe("https://stac.example/");
  expect(toAbsolute("/api/example.gif", "https://stac.example/api")).toBe("https://stac.example/api/example.gif");
  expect(toAbsolute("./example.gif", "https://stac.example/api")).toBe("https://stac.example/example.gif");
  expect(toAbsolute("./example.gif", "https://stac.example/api/")).toBe("https://stac.example/api/example.gif");
  expect(toAbsolute("./example.gif", "https://stac.example/catalog.json/")).toBe("https://stac.example/catalog.json/example.gif");
  expect(toAbsolute("http://y.de/test", "https://stac.example/catalog.json")).toBe("http://y.de/test");
  // todo
});

