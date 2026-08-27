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

test('fixGeoJson: keeps the ring closed when the penultimate vertex is near the first', () => {
  // The vertex before the closing position is within the dedup tolerance (1e-8) of the
  // first position, so removeConsecutiveDuplicates would otherwise drop the closing
  // position and leave the ring open. See issue #22.
  const poly = {
    type: 'Polygon',
    coordinates: [
      [
        [140, -30],
        [141, -30],
        [141, -29],
        [140.000000005, -30.000000005],
        [140, -30],
      ],
    ],
  };
  const fixed = fixGeoJson(poly);
  const ring = fixed.coordinates[0];
  expect(ring[0]).toEqual(ring[ring.length - 1]);
});

test('fixGeoJson: keeps a crossing ring joinable when the penultimate vertex is near the first', () => {
  // Same near-first penultimate vertex as above, but on a ring that crosses the antimeridian.
  // segment() deduplicates again internally, so if it drops the closing position the trailing
  // fragment can no longer be joined to the first one and buildPolygons() emits broken (e.g.
  // degenerate) fragments instead of a clean two-part split. See issue #22 / PR #23.
  const poly = {
    type: 'Polygon',
    coordinates: [
      [
        [170, 40],
        [-170, 40],
        [-170, 50],
        [170, 50],
        [170.000000005, 40.000000005],
        [170, 40],
      ],
    ],
  };
  const fixed = fixGeoJson(poly, { greatCircle: false });
  // Clean two-part split. Without the fix, the lost closure prevents joining the trailing
  // fragment and buildPolygons() emits three parts, including a degenerate 3-position ring.
  expect(fixed.type).toBe('MultiPolygon');
  expect(fixed.coordinates).toHaveLength(2);
  // Every ring is a valid, closed GeoJSON ring (first === last, at least 4 positions).
  for (const p of fixed.coordinates) {
    for (const ring of p) {
      expect(ring.length).toBeGreaterThanOrEqual(4);
      expect(ring[0]).toEqual(ring[ring.length - 1]);
    }
  }
  // The near-first vertex is preserved on the eastern (+180) side, not deduplicated away.
  const eastRing = fixed.coordinates.map((p) => p[0]).find((r) => r.some((c) => c[0] === 180));
  expect(eastRing.some((c) => Math.abs(c[0] - 170.000000005) < 1e-10 && Math.abs(c[1] - 40.000000005) < 1e-10)).toBe(
    true,
  );
});

test('fixGeoJson: fixes a real-world DEA scene whose penultimate vertex is near the first', () => {
  // Geometry of a real Digital Earth Australia STAC item that previously threw
  // "First and last Position are not equivalent" because deduplication dropped the
  // closing position. See issue #22 (comment by chris-thomas-dev):
  // https://data.dea.ga.gov.au/baseline/ga_ls9c_ard_3/105/083/2026/07/29/ga_ls9c_ard_3-2-1_105083_2026-07-29_final.stac-item.json
  const geometry = {
    type: 'Polygon',
    coordinates: [
      [
        [127.79726817678228, -34.23118992672607],
        [127.77550004838747, -34.22718645697245],
        [125.76813838533506, -33.83809319497515],
        [125.76403701580183, -33.836909643691236],
        [125.76404147173795, -33.83689437553843],
        [125.76315442728306, -33.836683646042474],
        [125.87846119424867, -33.439940220064635],
        [126.0927082267697, -32.69650190669003],
        [126.19451882551354, -32.3394704208156],
        [126.23358309924053, -32.202104867603914],
        [126.25614064060777, -32.12350046664746],
        [126.25696758154409, -32.123521322302324],
        [126.25808841270825, -32.12374846214478],
        [126.2589763489256, -32.12377007239651],
        [126.28457542996301, -32.128921459585655],
        [128.2517601405128, -32.510666535195426],
        [128.2517885307023, -32.51081201042139],
        [128.25292496200504, -32.51102279744615],
        [127.79967600449265, -34.23121163572936],
        [127.7988446350385, -34.231275399210205],
        [127.79799310908228, -34.23111863528665],
        [127.79726817678228, -34.23118992672607],
      ],
    ],
  };
  expect(() => fixGeoJson(geometry)).not.toThrow();
  const fixed = fixGeoJson(geometry);
  // The scene doesn't cross the antimeridian, so it stays a single, closed Polygon.
  expect(fixed.type).toBe('Polygon');
  const ring = fixed.coordinates[0];
  expect(ring[0]).toEqual(ring[ring.length - 1]);
});

test('fixGeoJson: keeps very small footprints intact', () => {
  // A ~10 x 6 m landscape element. A dedup tolerance relative to the coordinate values
  // (~50 m in latitude at 50°N) collapses the ring to fewer than 4 positions, making
  // turf's polygon() throw "Each LinearRing of a Polygon must have 4 or more Positions".
  // See https://github.com/radiantearth/stac-browser/issues/1002
  const geometry = {
    type: 'MultiPolygon',
    coordinates: [
      [
        [
          [5.924644101, 50.777198179],
          [5.924646423, 50.777190599],
          [5.924652201, 50.777171705],
          [5.924595033, 50.777150348],
          [5.924552903, 50.777148292],
          [5.924557435, 50.777193782],
          [5.924529216, 50.777193909],
          [5.924584781, 50.77720037],
          [5.924587654, 50.777191403],
          [5.924606609, 50.777193841],
          [5.924644101, 50.777198179],
        ],
      ],
    ],
  };
  expect(() => fixGeoJson(geometry, { greatCircle: false })).not.toThrow();
  const fixed = fixGeoJson(geometry, { greatCircle: false });
  expect(fixed.type).toBe('MultiPolygon');
  expect(fixed.coordinates).toHaveLength(1);
  const ring = fixed.coordinates[0][0];
  // All 11 positions survive deduplication and the ring stays closed.
  expect(ring).toHaveLength(11);
  expect(ring[0]).toEqual(ring[ring.length - 1]);
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
