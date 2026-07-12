import { booleanClockwise } from '@turf/boolean-clockwise';
import { booleanContains } from '@turf/boolean-contains';
import { centroid as turfCentroid } from '@turf/centroid';
import { point, polygon } from '@turf/helpers';
import { rewind } from '@turf/rewind';

/**
 * Fix GeoJSON geometries that cross the antimeridian (180th meridian / dateline)
 * by splitting them into valid multi-geometries.
 *
 * This is a JavaScript port of antimeridian-ts by Kris Powell
 * (https://github.com/krisaoe/antimeridian-ts, Apache-2.0),
 * which itself is a port of the Python antimeridian package by Pete Gadomski
 * (https://github.com/gadomski/antimeridian).
 *
 * Deviations from antimeridian-ts (all in favor of the Python implementation):
 * - Rings of polygons that were split at the antimeridian are properly closed
 *   (first position === last position) as required by the GeoJSON specification.
 * - Geometry types that can't cross the antimeridian (e.g. Point and MultiPoint)
 *   and Features without a geometry are returned unchanged instead of throwing an error.
 * - GeometryCollections are supported by fixing each geometry individually.
 * - Unclosed input rings are closed and consecutive (near-)duplicate positions are
 *   removed before processing, like shapely does in the Python implementation.
 * - The interpolation in `crossingLatitudeFlat` and the joining of split segments
 *   in `buildPolygons` are fixed to match the Python implementation.
 * - The centroid is area-weighted (as in shapely) instead of a mean of the vertices.
 * - Multiple holes in the same polygon are all preserved (the Python implementation
 *   in fact drops all but the last hole per polygon).
 *
 * @module antimeridian
 */

/**
 * Options for fixing GeoJSON.
 *
 * @typedef {Object} FixOptions
 * @property {boolean} [forceNorthPole=false] Force the geometry to enclose the north pole.
 * @property {boolean} [forceSouthPole=false] Force the geometry to enclose the south pole.
 * @property {boolean} [fixWinding=true] Fix the winding order so that exterior rings are counter-clockwise and holes are clockwise (as per RFC 7946).
 * @property {boolean} [greatCircle=true] Compute the latitude at which a segment crosses the antimeridian on the great circle between the two points. If set to `false`, a planar (flat) interpolation is used instead.
 * @property {boolean} [reverse=false] Reverse the coordinates of LineStrings and Polygons before fixing.
 */

const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

/**
 * Checks whether two numbers are close to each other,
 * like `math.isclose` in Python (relative tolerance of 1e-9).
 *
 * @private
 * @param {number} a First number
 * @param {number} b Second number
 * @returns {boolean} `true` if the numbers are close, `false` otherwise.
 */
function isClose(a, b) {
  return Math.abs(a - b) <= 1e-9 * Math.max(Math.abs(a), Math.abs(b));
}

/**
 * Checks whether two numbers are close to each other,
 * like `numpy.isclose` in Python (relative tolerance of 1e-5, absolute tolerance of 1e-8).
 *
 * @private
 * @param {number} a First number
 * @param {number} b Second number
 * @returns {boolean} `true` if the numbers are close, `false` otherwise.
 */
function isCloseLoose(a, b) {
  return Math.abs(a - b) <= 1e-8 + 1e-5 * Math.abs(b);
}

/**
 * Closes a ring if it is not closed yet.
 *
 * @private
 * @param {Array.<Array.<number>>} ring A ring (list of positions).
 * @returns {Array.<Array.<number>>} The closed ring.
 */
function closeRing(ring) {
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return [...ring, [first[0], first[1]]];
  }
  return ring;
}

/**
 * Removes consecutive near-duplicate positions from a list of positions.
 *
 * @private
 * @param {Array.<Array.<number>>} coords A list of positions.
 * @returns {Array.<Array.<number>>} The list of positions without consecutive near-duplicates.
 */
function removeConsecutiveDuplicates(coords) {
  if (coords.length < 2) {
    return coords;
  }
  const result = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const prev = result[result.length - 1];
    if (!isCloseLoose(coords[i][0], prev[0]) || !isCloseLoose(coords[i][1], prev[1])) {
      result.push(coords[i]);
    }
  }
  return result;
}

/**
 * Converts a lon/lat position to a cartesian vector on the unit sphere.
 *
 * @private
 * @param {Array.<number>} pt Position ([longitude, latitude])
 * @returns {Array.<number>} Cartesian coordinates ([x, y, z])
 */
function toCartesian(pt) {
  const lon = pt[0] * D2R;
  const lat = pt[1] * D2R;
  return [Math.cos(lon) * Math.cos(lat), Math.sin(lon) * Math.cos(lat), Math.sin(lat)];
}

/**
 * Computes the cross product of two cartesian vectors.
 *
 * @private
 * @param {Array.<number>} a Cartesian coordinates ([x, y, z])
 * @param {Array.<number>} b Cartesian coordinates ([x, y, z])
 * @returns {Array.<number>} Cartesian coordinates ([x, y, z])
 */
function crossProduct(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/**
 * Normalizes a cartesian vector to unit length.
 *
 * @private
 * @param {Array.<number>} v Cartesian coordinates ([x, y, z])
 * @returns {Array.<number>} Cartesian coordinates ([x, y, z])
 */
function normalizeVector(v) {
  const norm = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  return [v[0] / norm, v[1] / norm, v[2] / norm];
}

/**
 * Fixes a GeoJSON object (Feature, FeatureCollection or Geometry) so that
 * geometries crossing the antimeridian are split into valid multi-geometries.
 *
 * Polygons may become MultiPolygons and LineStrings may become MultiLineStrings.
 * Geometries that don't cross the antimeridian are returned (mostly) unchanged,
 * but the winding order may be fixed (unless disabled via the options).
 *
 * The function does not work in-place, it returns a new object.
 * Nevertheless, some (nested) properties may still be shared with the input object,
 * so the input object should not be altered afterwards.
 *
 * @param {Object} geojson The GeoJSON object to fix.
 * @param {FixOptions} options Options for fixing the GeoJSON object.
 * @returns {Object} The fixed GeoJSON object.
 */
export function fixGeoJson(geojson, options = {}) {
  const opts = {
    forceNorthPole: false,
    forceSouthPole: false,
    fixWinding: true,
    greatCircle: true,
    reverse: false,
    ...options,
  };

  if (geojson.type === 'Feature') {
    if (!geojson.geometry) {
      return geojson;
    }
    return {
      ...geojson,
      geometry: fixShape(geojson.geometry, opts),
    };
  } else if (geojson.type === 'FeatureCollection') {
    return {
      ...geojson,
      features: geojson.features.map((f) => fixGeoJson(f, opts)),
    };
  } else {
    return fixShape(geojson, opts);
  }
}

/**
 * Returns the segments of a GeoJSON object that are created when splitting
 * its geometries at the antimeridian.
 *
 * @param {Object} geojson The GeoJSON object (Feature, FeatureCollection or Geometry) to segment.
 * @param {boolean} greatCircle Compute the crossing latitude on the great circle between the two points (see FixOptions).
 * @returns {Object} A GeoJSON MultiLineString with the segments.
 */
export function segmentGeoJson(geojson, greatCircle = true) {
  if (geojson.type === 'Feature') {
    if (!geojson.geometry) {
      throw new Error('No geometry in Feature');
    }
    return {
      type: 'MultiLineString',
      coordinates: segmentShape(geojson.geometry, greatCircle),
    };
  } else if (geojson.type === 'FeatureCollection') {
    const segments = [];
    for (const feature of geojson.features) {
      if (feature.geometry) {
        segments.push(...segmentShape(feature.geometry, greatCircle));
      }
    }
    return {
      type: 'MultiLineString',
      coordinates: segments,
    };
  } else {
    return {
      type: 'MultiLineString',
      coordinates: segmentShape(geojson, greatCircle),
    };
  }
}

/**
 * Fixes a single GeoJSON geometry.
 *
 * @private
 * @param {Object} geom The GeoJSON geometry to fix.
 * @param {FixOptions} options Options for fixing the geometry.
 * @returns {Object} The fixed GeoJSON geometry.
 */
function fixShape(geom, options) {
  let workingGeom = geom;
  if (options.reverse) {
    if (workingGeom.type === 'LineString') {
      workingGeom = { ...workingGeom, coordinates: [...workingGeom.coordinates].reverse() };
    } else if (workingGeom.type === 'Polygon') {
      workingGeom = { ...workingGeom, coordinates: workingGeom.coordinates.map((r) => [...r].reverse()) };
    }
  }

  switch (workingGeom.type) {
    case 'Polygon':
      return fixPolygon(workingGeom, options);
    case 'MultiPolygon':
      return fixMultiPolygon(workingGeom, options);
    case 'LineString':
      return fixLineString(workingGeom, options.greatCircle ?? true);
    case 'MultiLineString':
      return fixMultiLineString(workingGeom, options.greatCircle ?? true);
    case 'GeometryCollection':
      return {
        ...workingGeom,
        geometries: workingGeom.geometries.map((g) => fixShape(g, options)),
      };
    default:
      // Points and MultiPoints can't cross the antimeridian
      return workingGeom;
  }
}

/**
 * Fixes a GeoJSON MultiPolygon.
 *
 * @private
 * @param {Object} multiPoly The GeoJSON MultiPolygon to fix.
 * @param {FixOptions} options Options for fixing the geometry.
 * @returns {Object} The fixed GeoJSON MultiPolygon.
 */
function fixMultiPolygon(multiPoly, options) {
  const polygons = [];
  for (const coords of multiPoly.coordinates) {
    const poly = { type: 'Polygon', coordinates: coords };
    polygons.push(...fixPolygonToList(poly, options));
  }
  return {
    type: 'MultiPolygon',
    coordinates: polygons.map((p) => p.coordinates),
  };
}

/**
 * Fixes a GeoJSON Polygon.
 *
 * @private
 * @param {Object} poly The GeoJSON Polygon to fix.
 * @param {FixOptions} options Options for fixing the geometry.
 * @returns {Object} The fixed geometry, either a GeoJSON Polygon or MultiPolygon.
 */
function fixPolygon(poly, options) {
  let { forceNorthPole = false, forceSouthPole = false, fixWinding = true, greatCircle = true } = options;

  if (forceNorthPole || forceSouthPole) {
    fixWinding = false;
  }

  const polygons = fixPolygonToList(poly, {
    forceNorthPole,
    forceSouthPole,
    fixWinding,
    greatCircle,
  });

  if (polygons.length === 1) {
    const p = polygons[0];
    // GeoJSON Polygon exteriors should be counter-clockwise.
    const isCW = booleanClockwise(p.coordinates[0]);

    if (!isCW) {
      return p;
    } else {
      // If it is clockwise, it implies the polygon wraps the world the "wrong way"
      // (or is just wound wrongly), so wrap the world and use the ring as a hole.
      return {
        type: 'Polygon',
        coordinates: [
          [
            [-180, 90],
            [-180, -90],
            [180, -90],
            [180, 90],
            [-180, 90],
          ],
          ...p.coordinates,
        ],
      };
    }
  } else {
    return {
      type: 'MultiPolygon',
      coordinates: polygons.map((p) => p.coordinates),
    };
  }
}

/**
 * Splits a GeoJSON Polygon at the antimeridian into a list of Polygons.
 *
 * @private
 * @param {Object} poly The GeoJSON Polygon to fix.
 * @param {FixOptions} options Options for fixing the geometry.
 * @returns {Array.<Object>} A list of GeoJSON Polygons.
 */
function fixPolygonToList(poly, options) {
  const { forceNorthPole = false, forceSouthPole = false, fixWinding = true, greatCircle = true } = options;

  const exterior = removeConsecutiveDuplicates(normalize(closeRing(poly.coordinates[0])));
  const interiorRings = poly.coordinates.slice(1).map(closeRing);
  let segments = segment(exterior, greatCircle);

  // Case 1: No crossing
  if (segments.length === 0) {
    const polyObj = polygon([exterior, ...interiorRings]);

    // Check winding of the exterior (should be counter-clockwise)
    const exteriorIsCW = booleanClockwise(polyObj.geometry.coordinates[0]);
    // Check winding of the interiors (holes should be clockwise)
    const holesAreWrong = polyObj.geometry.coordinates.slice(1).some((ring) => !booleanClockwise(ring));

    if (fixWinding && (exteriorIsCW || holesAreWrong)) {
      return [rewind(polyObj).geometry];
    }
    return [polyObj.geometry];
  }

  // Case 2: Crossing occurred
  const interiors = [];
  for (const interior of interiorRings) {
    const interiorSegments = segment(interior, greatCircle);

    if (interiorSegments.length > 0) {
      // Hole crosses the line
      if (fixWinding) {
        const unwrapped = interior.map(([x, y]) => [((x % 360) + 360) % 360, y]);

        // If the unwrapped hole is counter-clockwise, reverse it
        if (!booleanClockwise(unwrapped)) {
          console.warn('FixWindingWarning: Reversing interior ring.');
          interior.reverse();
          segments.push(...segment(interior, greatCircle));
        } else {
          segments.push(...interiorSegments);
        }
      } else {
        segments.push(...interiorSegments);
      }
    } else {
      interiors.push(interior);
    }
  }

  segments = extendOverPoles(segments, {
    forceNorthPole,
    forceSouthPole,
    fixWinding,
  });

  const builtPolygons = buildPolygons(segments);

  // Case 3: Assign non-split holes to the correct new polygon
  if (interiors.length > 0 && builtPolygons.length > 0) {
    const finalPolygons = [];
    // Convert built polygons to turf features for containment checks
    const turfPolys = builtPolygons.map((p) => polygon(p.coordinates));

    for (const turfPoly of turfPolys) {
      const myHoles = [];
      for (const hole of interiors) {
        // Check if the first point of the hole is inside the polygon
        const pt = point(hole[0]);
        if (booleanContains(turfPoly, pt)) {
          myHoles.push(hole);
        }
      }
      // Add holes to this polygon
      turfPoly.geometry.coordinates.push(...myHoles);
      finalPolygons.push(turfPoly.geometry);
    }
    return finalPolygons;
  }

  return builtPolygons;
}

/**
 * Fixes a GeoJSON LineString.
 *
 * @private
 * @param {Object} lineString The GeoJSON LineString to fix.
 * @param {boolean} greatCircle Compute the crossing latitude on the great circle between the two points (see FixOptions).
 * @returns {Object} The fixed geometry, either a GeoJSON LineString or MultiLineString.
 */
function fixLineString(lineString, greatCircle) {
  const segments = segment(lineString.coordinates, greatCircle);
  if (segments.length === 0) {
    return lineString;
  }
  return {
    type: 'MultiLineString',
    coordinates: segments,
  };
}

/**
 * Fixes a GeoJSON MultiLineString.
 *
 * @private
 * @param {Object} multiLine The GeoJSON MultiLineString to fix.
 * @param {boolean} greatCircle Compute the crossing latitude on the great circle between the two points (see FixOptions).
 * @returns {Object} The fixed GeoJSON MultiLineString.
 */
function fixMultiLineString(multiLine, greatCircle) {
  const lineStrings = [];
  for (const lineCoords of multiLine.coordinates) {
    const fixed = fixLineString({ type: 'LineString', coordinates: lineCoords }, greatCircle);
    if (fixed.type === 'LineString') {
      lineStrings.push(fixed.coordinates);
    } else {
      lineStrings.push(...fixed.coordinates);
    }
  }
  return {
    type: 'MultiLineString',
    coordinates: lineStrings,
  };
}

/**
 * Returns the segments for a single GeoJSON geometry.
 *
 * @private
 * @param {Object} geom The GeoJSON geometry to segment.
 * @param {boolean} greatCircle Compute the crossing latitude on the great circle between the two points (see FixOptions).
 * @returns {Array.<Array.<Array.<number>>>} A list of segments (lists of positions).
 */
function segmentShape(geom, greatCircle) {
  if (geom.type === 'Polygon') {
    return segmentPolygon(geom, greatCircle);
  } else if (geom.type === 'MultiPolygon') {
    let segments = [];
    for (const coords of geom.coordinates) {
      segments = segments.concat(segmentPolygon({ type: 'Polygon', coordinates: coords }, greatCircle));
    }
    return segments;
  } else if (geom.type === 'LineString') {
    return segment(geom.coordinates, greatCircle);
  } else if (geom.type === 'MultiLineString') {
    let segments = [];
    for (const line of geom.coordinates) {
      segments = segments.concat(segment(line, greatCircle));
    }
    return segments;
  } else {
    throw new Error(`Unsupported geometry type: ${geom.type}`);
  }
}

/**
 * Returns the segments for a GeoJSON Polygon.
 *
 * @private
 * @param {Object} poly The GeoJSON Polygon to segment.
 * @param {boolean} greatCircle Compute the crossing latitude on the great circle between the two points (see FixOptions).
 * @returns {Array.<Array.<Array.<number>>>} A list of segments (lists of positions).
 */
function segmentPolygon(poly, greatCircle) {
  const rings = poly.coordinates.map(closeRing);
  let segments = segment(rings[0], greatCircle);
  if (segments.length === 0) {
    segments = [rings[0]];
  }
  for (let i = 1; i < rings.length; i++) {
    const interiorSegments = segment(rings[i], greatCircle);
    if (interiorSegments.length > 0) {
      segments.push(...interiorSegments);
    } else {
      segments.push(rings[i]);
    }
  }
  return segments;
}

/**
 * Normalizes the longitudes of a ring to be within [-180, 180] and
 * aligns positions lying exactly on the antimeridian with their neighbors.
 *
 * @private
 * @param {Array.<Array.<number>>} coords A list of positions.
 * @returns {Array.<Array.<number>>} The normalized list of positions.
 */
function normalize(coords) {
  const original = [...coords];
  let allOnAntimeridian = true;
  const newCoords = [...coords];

  for (let i = 0; i < coords.length; i++) {
    const [lon, lat] = coords[i];

    if (isClose(lon, 180)) {
      const prev = newCoords[(i - 1 + coords.length) % coords.length];
      if (Math.abs(lat) !== 90 && isCloseLoose(prev[0], -180)) {
        newCoords[i] = [-180, lat];
      } else {
        newCoords[i] = [180, lat];
      }
    } else if (isClose(lon, -180)) {
      const prev = newCoords[(i - 1 + coords.length) % coords.length];
      if (Math.abs(lat) !== 90 && isCloseLoose(prev[0], 180)) {
        newCoords[i] = [180, lat];
      } else {
        newCoords[i] = [-180, lat];
      }
    } else {
      let normalized = (lon + 180) % 360;
      if (normalized < 0) {
        normalized += 360;
      }
      newCoords[i] = [normalized - 180, lat];
      allOnAntimeridian = false;
    }
  }
  return allOnAntimeridian ? original : newCoords;
}

/**
 * Splits a list of positions at the antimeridian.
 *
 * Returns an empty list if the positions don't cross the antimeridian.
 *
 * @private
 * @param {Array.<Array.<number>>} coords A list of positions.
 * @param {boolean} greatCircle Compute the crossing latitude on the great circle between the two points (see FixOptions).
 * @returns {Array.<Array.<Array.<number>>>} A list of segments (lists of positions).
 */
function segment(coords, greatCircle) {
  coords = removeConsecutiveDuplicates(coords);
  let currentSegment = [];
  const segments = [];

  for (let i = 0; i < coords.length - 1; i++) {
    const start = coords[i];
    const end = coords[i + 1];
    currentSegment.push(start);

    const diff = end[0] - start[0];

    if (diff > 180 && diff !== 360) {
      // Left crossing (e.g. 179 to -179)
      const lat = crossingLatitude(start, end, greatCircle);
      currentSegment.push([-180, lat]);
      segments.push(currentSegment);
      currentSegment = [[180, lat]];
    } else if (start[0] - end[0] > 180 && start[0] - end[0] !== 360) {
      // Right crossing (e.g. -179 to 179)
      const lat = crossingLatitude(end, start, greatCircle);
      currentSegment.push([180, lat]);
      segments.push(currentSegment);
      currentSegment = [[-180, lat]];
    }
  }

  if (segments.length === 0) {
    return [];
  }

  // Handle the last point and joining
  const last = coords[coords.length - 1];
  if (last[0] === segments[0][0][0] && last[1] === segments[0][0][1]) {
    segments[0] = currentSegment.concat(segments[0]);
  } else {
    currentSegment.push(last);
    segments.push(currentSegment);
  }

  return segments;
}

/**
 * Computes the latitude at which the line between two positions crosses the antimeridian.
 *
 * @private
 * @param {Array.<number>} start The start position.
 * @param {Array.<number>} end The end position.
 * @param {boolean} greatCircle Compute the crossing latitude on the great circle between the two points (see FixOptions).
 * @returns {number} The latitude of the crossing.
 */
function crossingLatitude(start, end, greatCircle) {
  if (Math.abs(start[0]) === 180) {
    return start[1];
  }
  if (Math.abs(end[0]) === 180) {
    return end[1];
  }
  return greatCircle ? crossingLatitudeGreatCircle(start, end) : crossingLatitudeFlat(start, end);
}

/**
 * Computes the antimeridian crossing latitude on the great circle between two positions.
 *
 * @private
 * @param {Array.<number>} start The start position.
 * @param {Array.<number>} end The end position.
 * @returns {number} The latitude of the crossing.
 */
function crossingLatitudeGreatCircle(start, end) {
  const p1 = toCartesian(start);
  const p2 = toCartesian(end);
  const n1 = crossProduct(p1, p2);
  const n2 = [0, -1, 0];
  const intersection = normalizeVector(crossProduct(n1, n2));
  const lat = Math.asin(intersection[2]) * R2D;
  return Number(lat.toFixed(7));
}

/**
 * Computes the antimeridian crossing latitude by planar interpolation between two positions.
 *
 * @private
 * @param {Array.<number>} start The start position.
 * @param {Array.<number>} end The end position.
 * @returns {number} The latitude of the crossing.
 */
function crossingLatitudeFlat(start, end) {
  const latDelta = end[1] - start[1];
  if (end[0] < 0) {
    return Number((start[1] + ((180.0 - start[0]) * latDelta) / (end[0] + 360.0 - start[0])).toFixed(7));
  } else {
    return Number((start[1] + ((start[0] + 180.0) * latDelta) / (start[0] + 360.0 - end[0])).toFixed(7));
  }
}

/**
 * Extends segments over the poles if the geometry encloses one of them.
 *
 * @private
 * @param {Array.<Array.<Array.<number>>>} segments A list of segments (lists of positions).
 * @param {Object} options Options for fixing the geometry (forceNorthPole, forceSouthPole, fixWinding).
 * @returns {Array.<Array.<Array.<number>>>} The extended list of segments.
 */
function extendOverPoles(segments, options) {
  const { forceNorthPole, forceSouthPole, fixWinding } = options;
  let leftStart = null;
  let rightStart = null;
  let leftEnd = null;
  let rightEnd = null;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const start = seg[0];
    const end = seg[seg.length - 1];

    if (start[0] === -180 && (leftStart === null || start[1] < leftStart.latitude)) {
      leftStart = { index: i, latitude: start[1] };
    }
    if (start[0] === 180 && (rightStart === null || start[1] > rightStart.latitude)) {
      rightStart = { index: i, latitude: start[1] };
    }
    if (end[0] === -180 && (leftEnd === null || end[1] < leftEnd.latitude)) {
      leftEnd = { index: i, latitude: end[1] };
    }
    if (end[0] === 180 && (rightEnd === null || end[1] > rightEnd.latitude)) {
      rightEnd = { index: i, latitude: end[1] };
    }
  }

  let isOverNorth = false;
  let isOverSouth = false;
  const originalSegments = segments.map((seg) => seg.map((p) => p.slice()));

  if (leftEnd) {
    if (forceNorthPole && !forceSouthPole && !rightEnd && (!leftStart || leftEnd.latitude > leftStart.latitude)) {
      isOverNorth = true;
      segments[leftEnd.index].push([-180, 90], [180, 90]);
      segments[leftEnd.index].reverse();
    } else if (forceSouthPole || !leftStart || leftEnd.latitude < leftStart.latitude) {
      isOverSouth = true;
      segments[leftEnd.index].push([-180, -90], [180, -90]);
    }
  }

  if (rightEnd) {
    if (forceSouthPole && !forceNorthPole && (!rightStart || rightEnd.latitude < rightStart.latitude)) {
      isOverSouth = true;
      segments[rightEnd.index].push([180, -90], [-180, -90]);
      segments[rightEnd.index].reverse();
    } else if (forceNorthPole || !rightStart || rightEnd.latitude > rightStart.latitude) {
      isOverNorth = true;
      segments[rightEnd.index].push([180, 90], [-180, 90]);
    }
  }

  if (fixWinding && isOverNorth && isOverSouth) {
    console.warn('FixWindingWarning: Reversing all segments.');
    originalSegments.forEach((seg) => seg.reverse());
    return originalSegments;
  }

  return segments;
}

/**
 * Builds closed polygons from a list of segments.
 *
 * @private
 * @param {Array.<Array.<Array.<number>>>} segments A list of segments (lists of positions).
 * @returns {Array.<Object>} A list of GeoJSON Polygons.
 */
function buildPolygons(segments) {
  if (segments.length === 0) {
    return [];
  }

  let seg = segments.pop();
  const segEnd = seg[seg.length - 1];
  const isRight = segEnd[0] === 180;

  const candidates = [];
  if (isSelfClosing(seg)) {
    // Self-closing segments might end up joining up with themselves,
    // but they might not (e.g. donuts).
    candidates.push({ index: null, latitude: seg[0][1] });
  }
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    // Is the start of s on the same side as the end of the segment?
    if (s[0][0] === segEnd[0]) {
      // If so, check the following:
      // - Is the start of s closer to the pole than the end of the segment, and
      // - is the end of s on the other side, or
      // - is the end of s further away from the pole than the start of the segment (e.g. donuts)?
      if (
        (isRight && s[0][1] > segEnd[1] && (!isSelfClosing(s) || s[s.length - 1][1] < seg[0][1])) ||
        (!isRight && s[0][1] < segEnd[1] && (!isSelfClosing(s) || s[s.length - 1][1] > seg[0][1]))
      ) {
        candidates.push({ index: i, latitude: s[0][1] });
      }
    }
  }

  // Sort the candidates so the closest point comes first in the list.
  candidates.sort((a, b) => (isRight ? a.latitude - b.latitude : b.latitude - a.latitude));
  const index = candidates.length > 0 ? candidates[0].index : null;

  if (index !== null) {
    const nextSeg = segments.splice(index, 1)[0];
    seg = seg.concat(nextSeg);
    segments.push(seg);
    return buildPolygons(segments);
  } else {
    const polygons = buildPolygons(segments);
    const allSame = seg.every((p) => p[0] === seg[0][0] && p[1] === seg[0][1]);
    if (!allSame) {
      // Close the ring as required by the GeoJSON specification
      const first = seg[0];
      const last = seg[seg.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        seg.push([first[0], first[1]]);
      }
      polygons.push({ type: 'Polygon', coordinates: [seg] });
    }
    return polygons;
  }
}

/**
 * Checks whether a segment closes on itself at the antimeridian.
 *
 * @private
 * @param {Array.<Array.<number>>} seg A segment (list of positions).
 * @returns {boolean} `true` if the segment is self-closing, `false` otherwise.
 */
function isSelfClosing(seg) {
  const isRight = seg[seg.length - 1][0] === 180;
  return (
    seg[0][0] === seg[seg.length - 1][0] &&
    ((isRight && seg[0][1] > seg[seg.length - 1][1]) || (!isRight && seg[0][1] < seg[seg.length - 1][1]))
  );
}

/**
 * Calculates the bounding box for a (fixed) GeoJSON Polygon or MultiPolygon.
 *
 * Supports antimeridian-spanning bounding boxes (where the western longitude is
 * larger than the eastern longitude) as per RFC 7946, section 5.2.
 *
 * @param {Object} shape The GeoJSON Feature, Polygon or MultiPolygon.
 * @param {boolean} forceOverAntimeridian Force the bounding box to span the antimeridian.
 * @returns {BoundingBox} The bounding box ([west, south, east, north]).
 */
export function bbox(shape, forceOverAntimeridian = false) {
  const geom = shape.type === 'Feature' ? shape.geometry : shape;
  if (!geom) {
    throw new Error('Invalid geometry');
  }

  if (geom.type === 'Polygon') {
    return calculateBounds(geom.coordinates);
  } else if (geom.type === 'MultiPolygon') {
    let crossesAntimeridian = false;
    const xmins = [];
    let ymin = 90;
    const xmaxs = [];
    let ymax = -90;

    for (const polyCoords of geom.coordinates) {
      const b = calculateBounds(polyCoords);
      xmins.push(b[0]);
      if (b[1] < ymin) {
        ymin = b[1];
      }
      xmaxs.push(b[2]);
      if (b[3] > ymax) {
        ymax = b[3];
      }

      // Check if the polygon touches the antimeridian on both sides
      // (a naive check based on bounds is not enough)
      if (isCoincidentToAntimeridian(polyCoords[0]) && !(b[0] === -180 && b[2] === 180)) {
        crossesAntimeridian = true;
      }
    }

    if (crossesAntimeridian || forceOverAntimeridian) {
      return [Math.max(...xmins), ymin, Math.min(...xmaxs), ymax];
    } else {
      return [Math.min(...xmins), ymin, Math.max(...xmaxs), ymax];
    }
  } else {
    throw new Error(`Unsupported geometry type for bbox: ${geom.type}`);
  }
}

/**
 * Calculates the bounds of a list of rings.
 *
 * @private
 * @param {Array.<Array.<Array.<number>>>} rings A list of rings (lists of positions).
 * @returns {BoundingBox} The bounding box ([west, south, east, north]).
 */
function calculateBounds(rings) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const ring of rings) {
    for (const p of ring) {
      if (p[0] < minX) {
        minX = p[0];
      }
      if (p[1] < minY) {
        minY = p[1];
      }
      if (p[0] > maxX) {
        maxX = p[0];
      }
      if (p[1] > maxY) {
        maxY = p[1];
      }
    }
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Checks whether a ring has an edge that lies on the antimeridian.
 *
 * @private
 * @param {Array.<Array.<number>>} ring A ring (list of positions).
 * @returns {boolean} `true` if the ring touches the antimeridian, `false` otherwise.
 */
function isCoincidentToAntimeridian(ring) {
  for (let i = 0; i < ring.length - 1; i++) {
    const start = ring[i];
    const end = ring[i + 1];
    if (Math.abs(start[0]) === 180 && start[0] === end[0]) {
      return true;
    }
  }
  return false;
}

/**
 * Calculates the centroid for a (fixed) GeoJSON Polygon or MultiPolygon.
 *
 * Handles the antimeridian by calculating the centroid from an identical
 * MultiPolygon with longitudes in [0, 360).
 *
 * The centroid is area-weighted (as in shapely, which the Python
 * implementation uses), not the mean of the vertices.
 *
 * @param {Object} shape The GeoJSON Feature or Geometry.
 * @returns {Point} The centroid ([longitude, latitude]).
 */
export function centroid(shape) {
  const geom = shape.type === 'Feature' ? shape.geometry : shape;
  if (!geom) {
    throw new Error('Invalid geometry');
  }

  if (geom.type === 'Polygon') {
    return polygonCentroid([geom.coordinates]);
  } else if (geom.type === 'MultiPolygon') {
    // Shift any polygon with negative longitudes by +360 to make the shape
    // contiguous in the [0, 360) range, calculate the centroid, then shift back.
    const shiftedCoords = geom.coordinates.map((polyCoords) => {
      const hasNegative = polyCoords[0].some((p) => p[0] < 0);
      if (hasNegative) {
        // Shift the entire polygon (exterior + interiors) by +360 degrees longitude
        return polyCoords.map((ring) => ring.map(([x, y]) => [x + 360, y]));
      } else {
        return polyCoords;
      }
    });

    let [x, y] = polygonCentroid(shiftedCoords);

    // Normalize back to [-180, 180]
    if (x > 180) {
      x -= 360;
    }
    return [x, y];
  } else {
    return turfCentroid(geom).geometry.coordinates;
  }
}

/**
 * Calculates the area-weighted centroid for a list of polygons
 * (each a list of rings, i.e. MultiPolygon coordinates).
 *
 * @private
 * @param {Array.<Array.<Array.<Array.<number>>>>} polygons MultiPolygon coordinates.
 * @returns {Point} The centroid ([longitude, latitude]).
 */
function polygonCentroid(polygons) {
  const acc = { area: 0, x: 0, y: 0 };
  for (const rings of polygons) {
    rings.forEach((ring, i) => {
      const closed = closeRing(ring);
      // Shoelace formula: twice the signed area and
      // the (not yet normalized) centroid of a single ring
      let area = 0;
      let x = 0;
      let y = 0;
      for (let j = 0; j < closed.length - 1; j++) {
        const [x1, y1] = closed[j];
        const [x2, y2] = closed[j + 1];
        const cross = x1 * y2 - x2 * y1;
        area += cross;
        x += (x1 + x2) * cross;
        y += (y1 + y2) * cross;
      }
      // Add exteriors and subtract holes, independent of their winding order
      const factor = (i === 0 ? 1 : -1) * Math.sign(area || 1);
      acc.area += factor * area;
      acc.x += factor * x;
      acc.y += factor * y;
    });
  }
  if (acc.area === 0) {
    // Degenerate polygons: fall back to the mean of the vertices
    return turfCentroid({ type: 'MultiPolygon', coordinates: polygons }).geometry.coordinates;
  }
  return [acc.x / (3 * acc.area), acc.y / (3 * acc.area)];
}
