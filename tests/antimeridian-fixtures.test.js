import fs from 'fs';
import { jest } from '@jest/globals';
import { bbox, centroid, fixGeoJson, segmentGeoJson } from '../src/antimeridian';

/**
 * Tests based on the test suite of the Python antimeridian package
 * (https://github.com/gadomski/antimeridian, Apache-2.0), using its
 * fixture files from tests/data (see tests/antimeridian/).
 *
 * The following parts of the Python test suite are NOT ported, due to the
 * restrictions/limitations of the antimeridian-ts port
 * (https://github.com/krisaoe/antimeridian-ts#readme):
 * - Invalid input geometries (`issues-182.json`): the Python version relies on
 *   shapely/GEOS to detect and repair invalid geometries, the JS port assumes
 *   valid inputs.
 * - Z coordinates: the JS port only handles 2D coordinates.
 * - `FixWindingWarning` assertions: the JS port logs to the console instead.
 * - CLI tests: there is no CLI.
 *
 * The Python tests compare geometries via shapely's `normalize()`, which is
 * insensitive to the winding order, the starting vertex of rings, and the
 * order of rings/polygons. The JS port is stricter about the winding order
 * than the Python version, so the comparison here canonicalizes both sides
 * the same way (see `canonicalGeometry`).
 */

const EPSILON = 1e-6;

function readFixture(path) {
  return JSON.parse(fs.readFileSync(path));
}

function readInput(name) {
  return readFixture(`./tests/antimeridian/input/${name}.json`);
}

function readOutput(name, subdirectory = 'flat') {
  return readFixture(`./tests/antimeridian/output/${subdirectory}/${name}.json`);
}

function pointsEqual(a, b) {
  return Math.abs(a[0] - b[0]) <= EPSILON && Math.abs(a[1] - b[1]) <= EPSILON;
}

function comparePoints(a, b) {
  return a[0] - b[0] || a[1] - b[1];
}

function isRingClockwise(coords) {
  let sum = 0;
  for (let i = 0; i < coords.length; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[(i + 1) % coords.length];
    sum += (x2 - x1) * (y2 + y1);
  }
  return sum > 0;
}

// Brings a ring into a canonical form: opened, deduplicated, in the given
// orientation, starting at the smallest vertex, closed again.
function canonicalRing(ring, clockwise) {
  let coords = ring.map((p) => [p[0], p[1]]);
  // Remove the closing point
  if (pointsEqual(coords[0], coords[coords.length - 1])) {
    coords.pop();
  }
  // Remove consecutive duplicate points
  coords = coords.filter((p, i) => i === 0 || !pointsEqual(p, coords[i - 1]));
  // Enforce the given orientation
  if (isRingClockwise(coords) !== clockwise) {
    coords.reverse();
  }
  // Rotate so that the ring starts at the smallest vertex
  let minIndex = 0;
  for (let i = 1; i < coords.length; i++) {
    if (comparePoints(coords[i], coords[minIndex]) < 0) {
      minIndex = i;
    }
  }
  coords = coords.slice(minIndex).concat(coords.slice(0, minIndex));
  // Close the ring again
  coords.push([...coords[0]]);
  return coords;
}

// Exterior rings counter-clockwise, holes clockwise and sorted
function canonicalPolygon(rings) {
  const exterior = canonicalRing(rings[0], false);
  const holes = rings.slice(1).map((ring) => canonicalRing(ring, true));
  holes.sort((a, b) => comparePoints(a[0], b[0]));
  return [exterior, ...holes];
}

function canonicalLine(line) {
  const coords = line.map((p) => [p[0], p[1]]);
  if (comparePoints(coords[0], coords[coords.length - 1]) > 0) {
    coords.reverse();
  }
  return coords;
}

// Mimics shapely's normalize(): brings a geometry into a canonical form that
// is insensitive to winding order, ring starting vertex and ring/polygon order.
function canonicalGeometry(geom) {
  switch (geom.type) {
    case 'Polygon':
      return { type: geom.type, coordinates: canonicalPolygon(geom.coordinates) };
    case 'MultiPolygon': {
      const polygons = geom.coordinates.map(canonicalPolygon);
      polygons.sort((a, b) => comparePoints(a[0][0], b[0][0]));
      return { type: geom.type, coordinates: polygons };
    }
    case 'LineString':
      return { type: geom.type, coordinates: canonicalLine(geom.coordinates) };
    case 'MultiLineString': {
      const lines = geom.coordinates.map(canonicalLine);
      lines.sort((a, b) => comparePoints(a[0], b[0]));
      return { type: geom.type, coordinates: lines };
    }
    default:
      return geom;
  }
}

function coordsAlmostEqual(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((v, i) => coordsAlmostEqual(v, b[i]));
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= EPSILON;
  }
  return a === b;
}

function expectGeometryEqual(actual, expected) {
  const a = canonicalGeometry(actual);
  const e = canonicalGeometry(expected);
  expect(a.type).toBe(e.type);
  if (!coordsAlmostEqual(a.coordinates, e.coordinates)) {
    // Fails with a readable diff
    expect(a.coordinates).toEqual(e.coordinates);
  }
}

// The JS port logs FixWindingWarnings to the console
let warnSpy;
beforeAll(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
  warnSpy.mockRestore();
});

const MODES = [
  ['flat', false],
  ['spherical', true],
];

describe.each(MODES)('fix polygon (%s)', (subdirectory, greatCircle) => {
  test.each([
    'almost-180',
    'complex-split',
    'crossing-latitude',
    'extra-crossing',
    'issues-187',
    'issues-81',
    'latitude-band',
    'north-pole',
    'one-hole',
    'over-180',
    'overlap',
    'point-on-antimeridian',
    'simple',
    'south-pole',
    'split',
    'two-holes',
  ])('%s', (name) => {
    const fixed = fixGeoJson(readInput(name), { greatCircle });
    expectGeometryEqual(fixed, readOutput(name, subdirectory));
  });

  test('issues-171', () => {
    // Adapted: The Python implementation accidentally drops all but the last hole
    // that is assigned to a polygon (stale `polygon` variable in the loop at the
    // end of `fix_polygon_to_list`), so the output fixture only contains one of
    // the two holes. The JS port keeps all holes, so the expected output is
    // adapted to also contain the first hole from the input.
    const fixed = fixGeoJson(readInput('issues-171'), { greatCircle });
    const expected = readOutput('issues-171', subdirectory);
    expected.coordinates.push(readInput('issues-171').coordinates[1]);
    expectGeometryEqual(fixed, expected);
  });

  test('both-poles', () => {
    const fixed = fixGeoJson(readInput('both-poles'), { greatCircle, fixWinding: false });
    expectGeometryEqual(fixed, readOutput('both-poles', subdirectory));
  });

  test('double fix', () => {
    let fixed = fixGeoJson(readInput('north-pole'), { greatCircle });
    fixed = fixGeoJson(fixed, { greatCircle });
    expectGeometryEqual(fixed, readOutput('north-pole', subdirectory));
  });

  test('force north pole', () => {
    const fixed = fixGeoJson(readInput('force-north-pole'), { greatCircle, forceNorthPole: true });
    expectGeometryEqual(fixed, readOutput('force-north-pole', subdirectory));
  });

  test('force south pole', () => {
    // https://github.com/gadomski/antimeridian/issues/124
    const fixed = fixGeoJson(readInput('issues-124'), { greatCircle, forceSouthPole: true });
    expectGeometryEqual(fixed, readOutput('issues-124', subdirectory));
  });

  test('great circle', () => {
    // https://github.com/gadomski/antimeridian/issues/153
    const fixed = fixGeoJson(readInput('great-circle'), { greatCircle });
    expectGeometryEqual(fixed, readOutput('great-circle', subdirectory));
  });

  test.each(['cw-only', 'cw-split', 'issues-174', 'issues-201'])('fix winding: %s', (name) => {
    const fixed = fixGeoJson(readInput(name), { greatCircle });
    expectGeometryEqual(fixed, readOutput(name, subdirectory));
  });

  test.each(['cw-only', 'cw-split'])('no fix winding: %s', (name) => {
    const fixed = fixGeoJson(readInput(name), { greatCircle, fixWinding: false });
    expectGeometryEqual(fixed, readOutput(`${name}-no-fix`, subdirectory));
  });

  describe.each([
    [true, false],
    [false, true],
    [true, true],
  ])('no fix winding when forcing poles (north: %s, south: %s)', (forceNorthPole, forceSouthPole) => {
    test.each(['cw-only', 'cw-split'])('%s', (name) => {
      const fixed = fixGeoJson(readInput(name), { greatCircle, forceNorthPole, forceSouthPole });
      expectGeometryEqual(fixed, readOutput(`${name}-no-fix`, subdirectory));
    });
  });

  test('reverse', () => {
    const feature = { type: 'Feature', geometry: readInput('issues-164'), properties: {} };
    const fixed = fixGeoJson(feature, { greatCircle, reverse: true });
    expectGeometryEqual(fixed.geometry, readOutput('issues-164', subdirectory));
  });

  test.each(['multi-split', 'multi-no-antimeridian'])('multi polygon: %s', (name) => {
    const fixed = fixGeoJson(readInput(name), { greatCircle });
    expectGeometryEqual(fixed, readOutput(name, subdirectory));
  });
});

describe.each(MODES)('fix line strings (%s)', (subdirectory, greatCircle) => {
  // The line fixtures produce the same output in both modes,
  // hence there is only a single (flat) output fixture.
  test.each(['line', 'multi-line'])('%s', (name) => {
    const fixed = fixGeoJson(readInput(name), { greatCircle });
    expectGeometryEqual(fixed, readOutput(name));
  });
});

describe.each([[true], [false]])('segments (great circle: %s)', (greatCircle) => {
  test('polygon', () => {
    const segments = segmentGeoJson(readInput('split'), greatCircle);
    expect(segments.type).toBe('MultiLineString');
    expect(segments.coordinates.length).toBe(2);
  });

  test('feature collection', () => {
    const featureCollection = {
      type: 'FeatureCollection',
      features: [{ type: 'Feature', geometry: readInput('split'), properties: {} }],
      another: 'property',
    };
    const segments = segmentGeoJson(featureCollection, greatCircle);
    expect(segments.coordinates.length).toBeGreaterThan(0);
  });
});

describe.each([[true], [false]])('do not segment antimeridian overlap (great circle: %s)', (greatCircle) => {
  test.each([
    [-180, -170],
    [170, 180],
  ])('box from %s to %s', (minX, maxX) => {
    const box = {
      type: 'Polygon',
      coordinates: [
        [
          [maxX, -10],
          [maxX, 10],
          [minX, 10],
          [minX, -10],
          [maxX, -10],
        ],
      ],
    };
    const fixed = fixGeoJson(box, { greatCircle });
    expect(fixed.type).toBe('Polygon');
  });
});

test('fix winding of an interior ring without segments', () => {
  const fixed = fixGeoJson(readInput('simple-with-ccw-hole'));
  expect(fixed.type).toBe('Polygon');
  // All holes must be clockwise
  for (const hole of fixed.coordinates.slice(1)) {
    expect(isRingClockwise(hole)).toBe(true);
  }
});

test('fix winding of an interior ring with segments', () => {
  const fixed = fixGeoJson(readInput('one-ccw-hole'));
  expectGeometryEqual(fixed, readOutput('one-hole', 'spherical'));
});

describe('bbox', () => {
  test.each([
    ['simple', [90, 40, 100, 50]],
    ['split', [170, 40, -170, 50]],
    ['multi-no-antimeridian', [90, 10, 100, 50]],
    ['north-pole', [-180, 40, 180, 90]],
    ['ocean', [-180, -85.609, 180, 90]],
  ])('%s', (name, expected) => {
    expect(bbox(readOutput(name))).toEqual(expected);
  });

  test('force over antimeridian', () => {
    const expected = [179.96779787822723, -19.044135782844712, -179.77058698198195, -18.555752850452095];
    expect(bbox(readOutput('issues-134'), true)).toEqual(expected);
  });
});

describe.each([[true], [false]])('stac-browser issue 736 (great circle: %s)', (greatCircle) => {
  // https://github.com/radiantearth/stac-browser/issues/736
  // A real-world polygon around the North Island of New Zealand with
  // longitudes > 180 that crosses the antimeridian.
  test('splits into a MultiPolygon with valid longitudes', () => {
    const fixed = fixGeoJson(readInput('stac-browser-736'), { greatCircle });
    expect(fixed.type).toBe('MultiPolygon');
    expect(fixed.coordinates.length).toBe(2);
    for (const polyCoords of fixed.coordinates) {
      for (const ring of polyCoords) {
        expect(ring[0]).toEqual(ring[ring.length - 1]);
        for (const [lon, lat] of ring) {
          expect(Math.abs(lon)).toBeLessThanOrEqual(180);
          expect(Math.abs(lat)).toBeLessThanOrEqual(90);
        }
      }
    }
  });

  test('bbox spans the antimeridian', () => {
    const fixed = fixGeoJson(readInput('stac-browser-736'), { greatCircle });
    const b = bbox(fixed);
    expect(b[0]).toBeCloseTo(175.6901737210196, 6);
    expect(b[1]).toBeCloseTo(-40.96669921183746, 6);
    expect(b[2]).toBeCloseTo(180.0853824789804 - 360, 6);
    expect(b[3]).toBeCloseTo(-37.36941278816254, 6);
  });
});

describe('centroid', () => {
  test('simple', () => {
    const [x, y] = centroid(readInput('simple'));
    expect(x).toBeCloseTo(95, 6);
    expect(y).toBeCloseTo(45, 6);
  });

  test('split', () => {
    const [x, y] = centroid(readOutput('split'));
    expect(x).toBeCloseTo(180, 6);
    expect(y).toBeCloseTo(45, 6);
  });

  test('split with shift', () => {
    const input = readInput('split');
    input.coordinates = input.coordinates.map((ring) => ring.map(([x, y]) => [x + 1, y]));
    const fixed = fixGeoJson(input, { greatCircle: false });
    const [x, y] = centroid(fixed);
    expect(x).toBeCloseTo(-179, 6);
    expect(y).toBeCloseTo(45, 6);
  });
});
