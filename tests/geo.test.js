import fs from 'fs';
import { centerOfBoundingBox, ensureBoundingBox, fixGeoJson, isAntimeridianBoundingBox, toGeoJSON, unionBoundingBox } from '../src/geo';

test('ensureBoundingBox', () => {
  // also tests ensureBoundingBox implicitly
});

test('isAntimeridianBoundingBox', () => {
  expect(isAntimeridianBoundingBox(null)).toBeFalsy();
  expect(isAntimeridianBoundingBox([])).toBeFalsy();
  expect(isAntimeridianBoundingBox([-180,-90,180,90])).toBeFalsy();
  expect(isAntimeridianBoundingBox([-180,-90,180,90])).toBeFalsy();
  expect(isAntimeridianBoundingBox([-179,-1,179,1])).toBeFalsy();

  expect(isAntimeridianBoundingBox([179,-1,-179,1])).toBeTruthy();
});

test('centerOfBoundingBox', () => {
  expect(centerOfBoundingBox(null)).toBeNull();
  expect(centerOfBoundingBox([])).toBeNull();
  expect(centerOfBoundingBox([-180,-90,180,90])).toEqual([0,0]);
  expect(centerOfBoundingBox([0,0,-10,0,0,30])).toEqual([0,0,10]);
  expect(centerOfBoundingBox([179,-1,-179,1])).toEqual([180,0]);
  expect(centerOfBoundingBox([170,20,-160,30])).toEqual([-175,25]);
  expect(centerOfBoundingBox([160,-30,-170,-20])).toEqual([175,-25]);
  expect(centerOfBoundingBox([-30,0,-150,0])).toEqual([90,0]);
});

test('unionBoundingBox', () => {
  expect(unionBoundingBox(null)).toBeNull();
  expect(unionBoundingBox([])).toBeNull();
  let bbox1 = [172.91,1.34,0,172.95,1.36,10];
  let bbox2 = [-180,-85,180,85];
  expect(unionBoundingBox([bbox1, bbox2, null])).toEqual(bbox2);
  expect(unionBoundingBox([null, null, null])).toBeNull();
});

describe('ensureBoundingBox', () => {
  test('invalid inputs', () => {
    expect(ensureBoundingBox(undefined)).toBeNull();
    expect(ensureBoundingBox(null)).toBeNull();
    expect(ensureBoundingBox({})).toBeNull();
    expect(ensureBoundingBox(["a"])).toBeNull();
    expect(ensureBoundingBox(123)).toBeNull();
    expect(ensureBoundingBox("")).toBeNull();
    expect(ensureBoundingBox([0,0,0,"0"])).toBeNull();
    expect(ensureBoundingBox([0,0,0])).toBeNull();
    expect(ensureBoundingBox([0,0,0,0,0])).toBeNull();
  });

  test('invalid bbox coords', () => {
    expect(ensureBoundingBox([-180,-91,180,90])).toBeNull();
    expect(ensureBoundingBox([-180,-90,180,91])).toBeNull();
    expect(ensureBoundingBox([360,-90,0,90])).toBeNull();
    expect(ensureBoundingBox([0,-90,360,90])).toBeNull();
  });

  test('valid bboxes', () => {
    const bbox1 = [172.91,1.34,172.95,1.36];
    expect(ensureBoundingBox(bbox1)).toEqual(bbox1);
    const bbox2 = [-179,-1,179,1];
    expect(ensureBoundingBox(bbox2)).toEqual(bbox2);
    const bbox3 = [179,-1,-179,1];
    expect(ensureBoundingBox(bbox3)).toEqual(bbox3);
    const bbox4 = [180,-90,-180,90];
    expect(ensureBoundingBox(bbox4)).toEqual(bbox4);
    const bbox5 = [180,90,-180,-90];
    expect(ensureBoundingBox(bbox5)).toEqual(bbox5);
  });

  test('must return 2D', () => {
    let bbox1 = [172.91,1.34,0,172.95,1.36,10];
    let bbox2 = [172.91,1.34,172.95,1.36];
    expect(ensureBoundingBox(bbox1)).toEqual(bbox2);
    expect(ensureBoundingBox(bbox2)).toEqual(bbox2);
  });

  test('must limit slightly larger bboxes', () => {
    let input = [-180.0000000000001, -90.0000000000001, 180.0000000000001, 90.0000000000001];
    let expected = [-180,-90,180,90];
    expect(ensureBoundingBox(input)).toEqual(expected);
    expect(ensureBoundingBox(expected)).toEqual(expected);
  });
});

test('toGeoJSON', () => {
  let make = (type, coordinates) => {
    return {
      type: "Feature",
      geometry: {
        type,
        coordinates
      },
      properties: {}
    };
  };
  expect(toGeoJSON([])).toBeNull();
  expect(toGeoJSON([-180,-90,180,90])).toEqual(make(
    "Polygon",
    [[[-180,90],[-180,-90],[180,-90],[180,90],[-180,90]]]
  ));
  expect(toGeoJSON([[-179,-1,179,1],null])).toEqual(make(
    "Polygon",
    [[[-179,1],[-179,-1],[179,-1],[179,1],[-179,1]]]
  ));
  expect(toGeoJSON([179,-1,-179,1])).toEqual(make(
    "MultiPolygon",
    [[[[-180,1],[-180,-1],[-179,-1],[-179,1],[-180,1]]],[[[179,1],[179,-1],[180,-1],[180,1],[179,1]]]]
  ));
});

test('fixGeoJson', () => {
  expect(fixGeoJson(null)).toBeNull();
  expect(fixGeoJson([])).toEqual([]);
  expect(fixGeoJson({})).toEqual({});

  const unlocated = {type: "Feature", geometry: null, bbox: null};
  expect(fixGeoJson(unlocated)).toEqual(unlocated);

  const validItem = JSON.parse(fs.readFileSync('./tests/examples/item.json'));
  expect(fixGeoJson(validItem)).toEqual(validItem);

  const invalidFeature = JSON.parse(fs.readFileSync('./tests/examples/invalid-feature.json'));
  const validFeature = JSON.parse(fs.readFileSync('./tests/examples/valid-feature.json'));
  expect(fixGeoJson(invalidFeature)).toEqual(validFeature);
});
