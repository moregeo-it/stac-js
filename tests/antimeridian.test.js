import { bbox, centroid, fixGeoJson, segmentGeoJson } from '../src/antimeridian';
import { toGeoJSON } from '../src/geo';
import Item from '../src/item';
import ItemCollection from '../src/itemcollection';

// A counter-clockwise polygon crossing the antimeridian
const crossingPolygon = {
  type: 'Polygon',
  coordinates: [
    [
      [170, 40],
      [-170, 40],
      [-170, 50],
      [170, 50],
      [170, 40],
    ],
  ],
};

// The expected result of fixing the crossing polygon (with greatCircle: false)
const splitMultiPolygon = {
  type: 'MultiPolygon',
  coordinates: [
    [
      [
        [180, 50],
        [170, 50],
        [170, 40],
        [180, 40],
        [180, 50],
      ],
    ],
    [
      [
        [-180, 40],
        [-170, 40],
        [-170, 50],
        [-180, 50],
        [-180, 40],
      ],
    ],
  ],
};

const simplePolygon = {
  type: 'Polygon',
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ],
};

function makeItem(geometry, bbox) {
  return new Item({
    stac_version: '1.1.0',
    type: 'Feature',
    id: 'test',
    geometry,
    bbox,
    properties: { datetime: '2024-01-01T00:00:00Z' },
    links: [],
    assets: {},
  });
}

test('fixGeoJson: splits a polygon crossing the antimeridian', () => {
  const fixed = fixGeoJson(crossingPolygon, { greatCircle: false });
  expect(fixed).toEqual(splitMultiPolygon);
});

test('fixGeoJson: splits with great circle interpolation by default', () => {
  const fixed = fixGeoJson(crossingPolygon);
  expect(fixed.type).toBe('MultiPolygon');
  expect(fixed.coordinates.length).toBe(2);
  // The great circle between (170, 40) and (-170, 40) bulges north
  const crossingLatitude = fixed.coordinates[0][0][3][1];
  expect(crossingLatitude).toBeGreaterThan(40);
  expect(crossingLatitude).toBeLessThan(41);
});

test('fixGeoJson: keeps a regular polygon as-is', () => {
  expect(fixGeoJson(simplePolygon)).toEqual(simplePolygon);
});

test('fixGeoJson: fixes the winding order of a clockwise polygon', () => {
  const clockwise = {
    type: 'Polygon',
    coordinates: [[...simplePolygon.coordinates[0]].reverse().map((c) => [...c])],
  };
  expect(fixGeoJson(clockwise)).toEqual(simplePolygon);
  // ... unless disabled
  expect(fixGeoJson(clockwise, { fixWinding: false }).coordinates).not.toEqual(simplePolygon.coordinates);
});

test('fixGeoJson: splits a LineString crossing the antimeridian', () => {
  const line = {
    type: 'LineString',
    coordinates: [
      [170, 0],
      [-170, 0],
    ],
  };
  expect(fixGeoJson(line, { greatCircle: false })).toEqual({
    type: 'MultiLineString',
    coordinates: [
      [
        [170, 0],
        [180, 0],
      ],
      [
        [-180, 0],
        [-170, 0],
      ],
    ],
  });
});

test('fixGeoJson: closes a polygon over the north pole', () => {
  const polePolygon = {
    type: 'Polygon',
    coordinates: [
      [
        [0, 80],
        [90, 80],
        [180, 80],
        [-90, 80],
        [0, 80],
      ],
    ],
  };
  const fixed = fixGeoJson(polePolygon);
  expect(fixed.type).toBe('Polygon');
  const ring = fixed.coordinates[0];
  // The ring is extended over the pole and closed
  expect(ring).toContainEqual([180, 90]);
  expect(ring).toContainEqual([-180, 90]);
  expect(ring[0]).toEqual(ring[ring.length - 1]);
});

test('fixGeoJson: handles Features, FeatureCollections and unsupported geometry types', () => {
  const feature = { type: 'Feature', geometry: crossingPolygon, properties: {} };
  expect(fixGeoJson(feature, { greatCircle: false })).toEqual({
    type: 'Feature',
    geometry: splitMultiPolygon,
    properties: {},
  });

  const pointFeature = { type: 'Feature', geometry: { type: 'Point', coordinates: [180, 0] }, properties: {} };
  const nullFeature = { type: 'Feature', geometry: null, properties: {} };
  const collection = { type: 'FeatureCollection', features: [pointFeature, nullFeature] };
  expect(fixGeoJson(collection)).toEqual(collection);
});

test('segmentGeoJson: returns the segments of a crossing polygon', () => {
  const segments = segmentGeoJson(crossingPolygon, false);
  expect(segments.type).toBe('MultiLineString');
  expect(segments.coordinates.length).toBe(2);
});

test('bbox: supports antimeridian-spanning bounding boxes', () => {
  expect(bbox(splitMultiPolygon)).toEqual([170, 40, -170, 50]);
  expect(bbox(simplePolygon)).toEqual([0, 0, 10, 10]);
});

test('centroid: handles split multi-polygons', () => {
  expect(centroid(splitMultiPolygon)).toEqual([180, 45]);
  expect(centroid(simplePolygon)).toEqual([5, 5]);
});

test('Item.toGeoJSON: fixes the antimeridian on request', () => {
  const item = makeItem(crossingPolygon, [170, 40, -170, 50]);

  // Disabled by default
  expect(item.toGeoJSON().geometry).toEqual(crossingPolygon);

  // Enabled via boolean or options object
  expect(item.toGeoJSON(true).geometry.type).toBe('MultiPolygon');
  expect(item.toGeoJSON({ greatCircle: false }).geometry).toEqual(splitMultiPolygon);

  // The Item itself is not modified
  expect(item.geometry).toEqual(crossingPolygon);
});

test('ItemCollection.toGeoJSON: fixes the antimeridian on request', () => {
  const collection = new ItemCollection({
    type: 'FeatureCollection',
    features: [
      makeItem(crossingPolygon, [170, 40, -170, 50]).toJSON(),
      makeItem(simplePolygon, [0, 0, 10, 10]).toJSON(),
    ],
    links: [],
  });
  expect(collection.toGeoJSON().features[0].geometry.type).toBe('Polygon');
  const fixed = collection.toGeoJSON({ greatCircle: false });
  expect(fixed.features[0].geometry).toEqual(splitMultiPolygon);
  expect(fixed.features[1].geometry).toEqual(simplePolygon);
});

test('toGeoJSON (geo): fixes the antimeridian on request', () => {
  const geojson = toGeoJSON([179, -1, -179, 1], true);
  expect(geojson.geometry.type).toBe('MultiPolygon');
  expect(geojson.geometry.coordinates.length).toBe(2);
  for (const polyCoords of geojson.geometry.coordinates) {
    const ring = polyCoords[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  }
});
