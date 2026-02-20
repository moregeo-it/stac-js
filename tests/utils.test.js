import { ensureNumber, hasText, isObject, mergeArraysOfObjects, URI } from '../src/utils';

test('hasText', () => {
  expect(hasText(undefined)).toBeFalsy();
  expect(hasText(null)).toBeFalsy();
  expect(hasText({})).toBeFalsy();
  expect(hasText(["a"])).toBeFalsy();
  expect(hasText(123)).toBeFalsy();
  expect(hasText("")).toBeFalsy();
  expect(hasText(" ")).toBeTruthy();
  expect(hasText("a")).toBeTruthy();
  expect(hasText("123")).toBeTruthy();
});

test('isObject', () => {
  expect(isObject(null)).toBe(false); // null
  expect(isObject(true)).toBe(false); // boolean
  expect(isObject([])).toBe(false); // array
  expect(isObject(123)).toBe(false); // number
  expect(isObject(Math.min)).toBe(false); // function
  expect(isObject({})).toBe(true); // plain object
  class Test {}
  expect(isObject(new Test())).toBe(true); // object instance
});

test('mergeArraysOfObjects', () => {
  expect(mergeArraysOfObjects()).toEqual([]);
  expect(mergeArraysOfObjects([])).toEqual([]);
  expect(mergeArraysOfObjects({a: 1})).toEqual([]);
  expect(mergeArraysOfObjects([{a: 1}, {b: 1}], [{a: 2}, {c: 3}])).toEqual([{a: 2}, {b:1, c: 3}]);
  expect(mergeArraysOfObjects([{a: 1}, {b: 1}, {c: 1}], [{a: 2, d: 2}], [{a: 3}, {b: 3}])).toEqual([{a: 3, d: 2}, {b: 3}, {c: 1}]);
});

test('ensureNumber', () => {
  expect(ensureNumber(undefined, 0, 1)).toBeNull();
  expect(ensureNumber(null, 0, 1)).toBeNull();
  expect(ensureNumber({}, 0, 1)).toBeNull();
  expect(ensureNumber([], 0, 1)).toBeNull();
  expect(ensureNumber("a", 0, 1)).toBeNull();
  expect(ensureNumber(true, 0, 1)).toBeNull();
  expect(ensureNumber(0, 1, 2)).toBeNull();
  expect(ensureNumber(3, 1, 2)).toBeNull();
  expect(ensureNumber(1, 1, 2)).toBe(1);
  expect(ensureNumber(2, 1, 2)).toBe(2);
  expect(ensureNumber(0.99, 1, 2, 0.01)).toBe(1);
  expect(ensureNumber(2.01, 1, 2, 0.01)).toBe(2);
  expect(ensureNumber(-0.99, -2, -1, 0.01)).toBe(-1);
  expect(ensureNumber(-2.01, -2, -1, 0.01)).toBe(-2);
});

test('URI', () => {
  // Testing URL encoding: %20 vs. + (we want %20)
  // see https://github.com/radiantearth/stac-browser/issues/804
  const spacePlusUri = "http://stac.example/data.php?Service=Hilltop&Request=GetData&Site=Abbots%20Creek%20at%20Featherston&Measurement=Daily%20Rainfall%20%5BRainfall%5D";
  const spacePercent20Uri = "http://stac.example/data.php?Service=Hilltop&Request=GetData&Site=Abbots%20Creek%20at%20Featherston&Measurement=Daily%20Rainfall%20%5BRainfall%5D";
  expect(URI(spacePlusUri).toString()).toBe(spacePercent20Uri);
  expect(URI(spacePercent20Uri).toString()).toBe(spacePercent20Uri);
  // Testing duplicate query parameters
  const duplicateQueryUri = "http://stac.example/data.php?a=1&a=2";
  expect(URI(duplicateQueryUri).toString()).toBe(duplicateQueryUri);
});
