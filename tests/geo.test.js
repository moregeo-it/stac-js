import fs from 'fs';
import {
  centerOfBoundingBox,
  ensureBoundingBox,
  fixGeoJson,
  isAntimeridianBoundingBox,
  toGeoJSON,
  unionBoundingBox,
} from '../src/geo';

test('ensureBoundingBox', () => {
  // also tests ensureBoundingBox implicitly
});

test('isAntimeridianBoundingBox', () => {
  expect(isAntimeridianBoundingBox(null)).toBeFalsy();
  expect(isAntimeridianBoundingBox([])).toBeFalsy();
  expect(isAntimeridianBoundingBox([-180, -90, 180, 90])).toBeFalsy();
  expect(isAntimeridianBoundingBox([-180, -90, 180, 90])).toBeFalsy();
  expect(isAntimeridianBoundingBox([-179, -1, 179, 1])).toBeFalsy();

  expect(isAntimeridianBoundingBox([179, -1, -179, 1])).toBeTruthy();
});

test('centerOfBoundingBox', () => {
  expect(centerOfBoundingBox(null)).toBeNull();
  expect(centerOfBoundingBox([])).toBeNull();
  expect(centerOfBoundingBox([-180, -90, 180, 90])).toEqual([0, 0]);
  expect(centerOfBoundingBox([0, 0, -10, 0, 0, 30])).toEqual([0, 0, 10]);
  expect(centerOfBoundingBox([179, -1, -179, 1])).toEqual([180, 0]);
  expect(centerOfBoundingBox([170, 20, -160, 30])).toEqual([-175, 25]);
  expect(centerOfBoundingBox([160, -30, -170, -20])).toEqual([175, -25]);
  expect(centerOfBoundingBox([-30, 0, -150, 0])).toEqual([90, 0]);
});

test('unionBoundingBox', () => {
  expect(unionBoundingBox(null)).toBeNull();
  expect(unionBoundingBox([])).toBeNull();
  let bbox1 = [172.91, 1.34, 0, 172.95, 1.36, 10];
  let bbox2 = [-180, -85, 180, 85];
  expect(unionBoundingBox([bbox1, bbox2, null])).toEqual(bbox2);
  expect(unionBoundingBox([null, null, null])).toBeNull();

  // Single bbox unions to itself.
  expect(unionBoundingBox([[10, -5, 20, 5]])).toEqual([10, -5, 20, 5]);

  // Two disjoint boxes not crossing the antimeridian => normal union.
  expect(
    unionBoundingBox([
      [-10, -5, 0, 5],
      [10, 0, 20, 10],
    ]),
  ).toEqual([-10, -5, 20, 10]);

  // A box crossing the antimeridian keeps its crossing in the union.
  expect(unionBoundingBox([[175, -10, -179, 10]])).toEqual([175, -10, -179, 10]);

  // Union of a crossing box and a box just west of it stays crossing (west > east).
  expect(
    unionBoundingBox([
      [175, -10, -179, 10],
      [170, -5, 174, 5],
    ]),
  ).toEqual([170, -10, -179, 10]);

  // Union of two boxes on either side of the antimeridian crosses it (smaller extent).
  expect(
    unionBoundingBox([
      [170, 0, 175, 10],
      [-175, 0, -170, 10],
    ]),
  ).toEqual([170, 0, -170, 10]);
});

describe('ensureBoundingBox', () => {
  test('invalid inputs', () => {
    expect(ensureBoundingBox(undefined)).toBeNull();
    expect(ensureBoundingBox(null)).toBeNull();
    expect(ensureBoundingBox({})).toBeNull();
    expect(ensureBoundingBox(['a'])).toBeNull();
    expect(ensureBoundingBox(123)).toBeNull();
    expect(ensureBoundingBox('')).toBeNull();
    expect(ensureBoundingBox([0, 0, 0, '0'])).toBeNull();
    expect(ensureBoundingBox([0, 0, 0])).toBeNull();
    expect(ensureBoundingBox([0, 0, 0, 0, 0])).toBeNull();
  });

  test('invalid bbox coords', () => {
    expect(ensureBoundingBox([-180, -91, 180, 90])).toBeNull();
    expect(ensureBoundingBox([-180, -90, 180, 91])).toBeNull();
    expect(ensureBoundingBox(['a', -90, 0, 90])).toBeNull();
    expect(ensureBoundingBox([Infinity, -90, 0, 90])).toBeNull();
    expect(ensureBoundingBox([0, -90, Infinity, 90])).toBeNull();
    expect(ensureBoundingBox([-Infinity, -90, 0, 90])).toBeNull();
    expect(ensureBoundingBox([NaN, -90, 0, 90])).toBeNull();
    expect(ensureBoundingBox([0, NaN, 10, 90])).toBeNull();
  });

  test('longitudes are wrapped around the antimeridian', () => {
    // see https://github.com/radiantearth/stac-browser/issues/736
    // east of the antimeridian => bbox crosses the antimeridian (west > east)
    expect(ensureBoundingBox([175, -41, 190, -37])).toEqual([175, -41, -170, -37]);
    // west of the antimeridian => bbox crosses the antimeridian (west > east)
    expect(ensureBoundingBox([-190, 10, -170, 20])).toEqual([170, 10, -170, 20]);
    // both out of range on the same side => normal bbox
    expect(ensureBoundingBox([185, 10, 190, 20])).toEqual([-175, 10, -170, 20]);
    // spans (more than) the whole world
    expect(ensureBoundingBox([0, -90, 360, 90])).toEqual([-180, -90, 180, 90]);
    expect(ensureBoundingBox([-200, -90, 200, 90])).toEqual([-180, -90, 180, 90]);
  });

  test('valid bboxes', () => {
    const bbox1 = [172.91, 1.34, 172.95, 1.36];
    expect(ensureBoundingBox(bbox1)).toEqual(bbox1);
    const bbox2 = [-179, -1, 179, 1];
    expect(ensureBoundingBox(bbox2)).toEqual(bbox2);
    const bbox3 = [179, -1, -179, 1];
    expect(ensureBoundingBox(bbox3)).toEqual(bbox3);
    const bbox4 = [180, -90, -180, 90];
    expect(ensureBoundingBox(bbox4)).toEqual(bbox4);
    const bbox5 = [180, 90, -180, -90];
    expect(ensureBoundingBox(bbox5)).toEqual(bbox5);
  });

  test('must return 2D', () => {
    let bbox1 = [172.91, 1.34, 0, 172.95, 1.36, 10];
    let bbox2 = [172.91, 1.34, 172.95, 1.36];
    expect(ensureBoundingBox(bbox1)).toEqual(bbox2);
    expect(ensureBoundingBox(bbox2)).toEqual(bbox2);
  });

  test('must limit slightly larger bboxes', () => {
    let input = [-180.0000000000001, -90.0000000000001, 180.0000000000001, 90.0000000000001];
    let expected = [-180, -90, 180, 90];
    expect(ensureBoundingBox(input)).toEqual(expected);
    expect(ensureBoundingBox(expected)).toEqual(expected);
  });
});

test('toGeoJSON', () => {
  let make = (type, coordinates) => {
    return {
      type: 'Feature',
      geometry: {
        type,
        coordinates,
      },
      properties: {},
    };
  };
  expect(toGeoJSON([])).toBeNull();
  expect(toGeoJSON([-180, -90, 180, 90])).toEqual(
    make('Polygon', [
      [
        [-180, 90],
        [-180, -90],
        [180, -90],
        [180, 90],
        [-180, 90],
      ],
    ]),
  );
  expect(toGeoJSON([[-179, -1, 179, 1], null])).toEqual(
    make('Polygon', [
      [
        [-179, 1],
        [-179, -1],
        [179, -1],
        [179, 1],
        [-179, 1],
      ],
    ]),
  );
  expect(toGeoJSON([179, -1, -179, 1])).toEqual(
    make('MultiPolygon', [
      [
        [
          [-180, 1],
          [-180, -1],
          [-179, -1],
          [-179, 1],
          [-180, 1],
        ],
      ],
      [
        [
          [179, 1],
          [179, -1],
          [180, -1],
          [180, 1],
          [179, 1],
        ],
      ],
    ]),
  );
});

test('fixGeoJson', () => {
  expect(fixGeoJson(null)).toBeNull();
  expect(fixGeoJson([])).toEqual([]);
  expect(fixGeoJson({})).toEqual({});

  const unlocated = { type: 'Feature', geometry: null, bbox: null };
  expect(fixGeoJson(unlocated)).toEqual(unlocated);

  const validItem = JSON.parse(fs.readFileSync('./tests/examples/item.json'));
  expect(fixGeoJson(validItem)).toEqual(validItem);

  const invalidFeature = JSON.parse(fs.readFileSync('./tests/examples/invalid-feature.json'));
  const validFeature = JSON.parse(fs.readFileSync('./tests/examples/valid-feature.json'));
  expect(fixGeoJson(invalidFeature)).toEqual(validFeature);
});
