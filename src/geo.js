import { fixGeoJson as fixAntimeridianGeoJson } from './antimeridian.js';
import { ensureNumber, isObject } from './utils.js';

/**
 * Applies the antimeridian fix to a GeoJSON object if requested.
 *
 * @private
 * @param {Object} geojson The GeoJSON object.
 * @param {boolean|FixOptions} fixAntimeridian If set to `true` or an options object, geometries that cross the antimeridian are fixed (split into multi-geometries).
 * @returns {Object} The (fixed) GeoJSON object.
 * @see {@link module:antimeridian~fixGeoJson}
 */
export function applyAntimeridianFix(geojson, fixAntimeridian) {
  if (fixAntimeridian && isObject(geojson)) {
    return fixAntimeridianGeoJson(geojson, fixAntimeridian === true ? {} : fixAntimeridian);
  }
  return geojson;
}

function toObject(bbox) {
  let hasZ = bbox.length >= 6;
  let west = bbox[0];
  let east = bbox[hasZ ? 3 : 2];
  let south = bbox[1];
  let north = bbox[hasZ ? 4 : 3];
  let obj = { west, east, south, north };
  if (hasZ) {
    obj.base = bbox[2];
    obj.height = bbox[5];
  }
  return obj;
}

function bboxToCoords(bbox) {
  let { west, east, south, north } = toObject(bbox);
  return [
    [
      [west, north],
      [west, south],
      [east, south],
      [east, north],
      [west, north],
    ],
  ];
}

/**
 * Returns the center of the STAC entity.
 *
 * @param {BoundingBox|null} bbox
 * @returns {Point|null}
 */
export function centerOfBoundingBox(bbox) {
  bbox = ensureBoundingBox(bbox, true);
  if (!bbox) {
    return null;
  }
  let obj = toObject(bbox);
  let point = [];
  // todo: implement also for bboxes that cross the boundaries at the poles
  if (isAntimeridianBoundingBox(bbox)) {
    let x = (obj.west + 360 + obj.east) / 2;
    if (x > 180) {
      x -= 360;
    }
    point.push(x);
  } else {
    point.push((obj.west + obj.east) / 2);
  }
  point.push((obj.south + obj.north) / 2); // y
  if (typeof obj.base !== 'undefined') {
    point.push((obj.base + obj.height) / 2); // z
  }
  return point;
}

function fixGeoJsonGoordinates(coords) {
  if (Array.isArray(coords[0])) {
    // Handle nested coordinates (e.g., MultiPolygons, LineStrings)
    return coords.map(fixGeoJsonGoordinates);
  }
  // Fix individual coordinate [longitude, latitude]
  const [lon, lat] = coords;
  return [ensureNumber(lon, -180, 180), ensureNumber(lat, -90, 90)];
}

/**
 * Fix coordinates in a GeoJSON object to be within the CRS range.
 *
 * Function works in-place.
 *
 * @param {Object} geojson - The GeoJSON object to be checked.
 * @returns {Object} The fixed GeoJSON object.
 */
export function fixGeoJson(geojson) {
  if (!isObject(geojson)) {
    return geojson;
  }
  if (geojson.bbox) {
    geojson.bbox = ensureBoundingBox(geojson.bbox);
  }
  if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach((feature) => fixGeoJson(feature));
  } else if (geojson.type === 'Feature') {
    geojson.geometry = fixGeoJson(geojson.geometry);
  } else if (geojson.type === 'GeometryCollection') {
    geojson.geometries.forEach((geometry) => fixGeoJson(geometry));
  } else if (geojson.coordinates) {
    geojson.coordinates = fixGeoJsonGoordinates(geojson.coordinates);
  }
  return geojson;
}

/**
 * Converts one or more bounding boxes to a GeoJSON Feature.
 *
 * The Feature contains a Polygon or MultiPolygon based on the given number of valid bounding boxes.
 *
 * @param {BoundingBox|Array.<BoundingBox>} bboxes
 * @param {boolean|FixOptions} fixAntimeridian If set to `true` or an options object, geometries that cross the antimeridian are fixed (split into multi-geometries).
 * @returns {Object|null}
 */
export function toGeoJSON(bboxes, fixAntimeridian = false) {
  if (bboxes.every((c) => typeof c === 'number')) {
    // Wrap a single bounding box into an array
    bboxes = [bboxes];
  }

  bboxes = bboxes
    .map((bbox) => ensureBoundingBox(bbox))
    // Remove invalid bounding boxes
    .filter((bbox) => bbox !== null);

  // Return if no valid bbox is given
  if (!Array.isArray(bboxes) || bboxes.length === 0) {
    return null;
  }

  let coordinates = bboxes.reduce((list, bbox) => {
    // todo: implement also for bboxes that cross the boundaries at the poles
    // see https://github.com/DanielJDufour/bbox-fns/blob/main/split.js
    if (isAntimeridianBoundingBox(bbox)) {
      let { west, east, south, north } = toObject(bbox);
      list.push(bboxToCoords([-180, south, east, north]));
      list.push(bboxToCoords([west, south, 180, north]));
    } else {
      list.push(bboxToCoords(bbox));
    }
    return list;
  }, []);

  let geometry = null;
  if (coordinates.length === 1) {
    geometry = {
      type: 'Polygon',
      coordinates: coordinates[0],
    };
  } else if (coordinates.length > 1) {
    geometry = {
      type: 'MultiPolygon',
      coordinates,
    };
  }
  if (geometry) {
    const feature = {
      type: 'Feature',
      geometry,
      properties: {},
    };
    return applyAntimeridianFix(feature, fixAntimeridian);
  }
}

/**
 * Ensures a longitude is within [-180, 180].
 *
 * Longitudes outside of the range are wrapped around the antimeridian,
 * e.g. 190 becomes -170.
 *
 * @private
 * @param {number} lon The longitude.
 * @returns {number|null}
 */
function ensureLongitude(lon) {
  const num = ensureNumber(lon, -180, 180);
  if (num !== null) {
    return num;
  }
  if (!Number.isFinite(lon)) {
    return null;
  }
  let normalized = (lon + 180) % 360;
  if (normalized < 0) {
    normalized += 360;
  }
  return normalized - 180;
}

/**
 * Ensure this is a valid bounding box.
 *
 * This function will ensure that the given bounding box is valid and otherwise return `null`.
 *
 * Longitudes outside of [-180, 180] are wrapped around the antimeridian,
 * e.g. a bounding box of [175, -41, 190, -37] becomes [175, -41, -170, -37].
 * This may result in a bounding box that crosses the antimeridian (i.e. west > east)
 * as defined by GeoJSON (RFC 7946, section 5.2).
 *
 * If the bounding box is 3D, the function will return a 2D bounding box unless `allow3D` is set to `true`. Doesn't ensure that the bounding box is 3D in case `allow3D` is set to `true`.
 *
 * @param {BoundingBox|Array.<number>} bbox The bounding box to check.
 * @param {boolean} allow3D - Whether to return 3D bounding boxes or not. By default all bounding boxes are returned as 2D.
 * @returns {BoundingBox|null}
 */
export function ensureBoundingBox(bbox, allow3D = false) {
  if (!Array.isArray(bbox) || ![4, 6].includes(bbox.length)) {
    return null;
  }

  let { west, east, south, north, base, height } = toObject(bbox);
  // Some bounding boxes are slightly too large (due to floating point errors).
  // So you may get 90.00000001 instead of 90. To avoid this, we allow for a small delta.
  if (Number.isFinite(west) && Number.isFinite(east) && east - west >= 360) {
    // The bounding box spans (more than) the whole longitude range
    west = -180;
    east = 180;
  } else {
    west = ensureLongitude(west);
    east = ensureLongitude(east);
  }
  south = ensureNumber(south, -90, 90);
  north = ensureNumber(north, -90, 90);
  if (allow3D && bbox.length === 6) {
    bbox = [west, south, base, east, north, height];
  } else {
    bbox = [west, south, east, north];
  }
  if (bbox.some((n) => n === null)) {
    return null;
  }
  return bbox;
}

/**
 * Checks whether the given bounding box crosses the antimeridian.
 *
 * @param {BoundingBox} bbox
 * @returns {boolean}
 */
export function isAntimeridianBoundingBox(bbox) {
  bbox = ensureBoundingBox(bbox);
  if (!bbox) {
    return false;
  }

  let { west, east } = toObject(bbox);
  return west > east;
}

/**
 * Compute the union of a list of bounding boxes.
 *
 * The function is aware of the antimeridian: input boxes may cross it (west > east)
 * and the returned box may cross it, too, if that yields the smaller extent.
 * Following GeoJSON (RFC 7946, section 5.2), a box crossing the antimeridian is
 * expressed with a western longitude that is larger than the eastern longitude.
 *
 * The function ignores any invalid bounding boxes or values for the third dimension.
 *
 * @param {Array.<BoundingBox|null>} bboxes
 * @returns {BoundingBox|null}
 * @see {ensureBoundingBox}
 */
export function unionBoundingBox(bboxes) {
  if (!Array.isArray(bboxes) || bboxes.length === 0) {
    return null;
  }

  // Latitude is a simple min/max; longitude has to be handled on the circle so
  // that boxes crossing the antimeridian are unioned correctly (see below).
  let south = null;
  let north = null;
  // Longitude coverage as intervals on the [0, 360] circle, shifted so that the
  // antimeridian is the 0/360 seam (180° -> 0, -180° -> 360), going eastward.
  // Each box contributes its eastward arc from west to east; arcs wrapping past
  // the seam are split into two so that all intervals are linear. The original
  // longitudes are kept per endpoint to avoid floating point drift on output;
  // `null` marks an endpoint that sits exactly on the seam (±180).
  const pieces = [];
  let full = false;
  for (let bbox of bboxes) {
    bbox = ensureBoundingBox(bbox);
    if (!bbox) {
      continue;
    }
    const { west, south: s, east, north: n } = toObject(bbox);
    south = south === null ? s : Math.min(south, s);
    north = north === null ? n : Math.max(north, n);

    if (west === -180 && east === 180) {
      // Spans the whole longitude range.
      full = true;
      continue;
    }
    const start = west + 180;
    const length = (((east + 180 - start) % 360) + 360) % 360;
    const end = start + length;
    if (end <= 360) {
      pieces.push({ s: start, e: end, west, east });
    } else {
      pieces.push({ s: start, e: 360, west, east: null });
      pieces.push({ s: 0, e: end - 360, west: null, east });
    }
  }

  if (south === null) {
    return null;
  }
  if (full || pieces.length === 0) {
    return ensureBoundingBox([-180, south, 180, north]);
  }

  // Merge overlapping/touching coverage intervals, keeping the original west of
  // the interval's start and the original east of its (current) end.
  pieces.sort((a, b) => a.s - b.s);
  const merged = [{ ...pieces[0] }];
  for (let i = 1; i < pieces.length; i++) {
    const last = merged[merged.length - 1];
    if (pieces[i].s <= last.e) {
      if (pieces[i].e > last.e) {
        last.e = pieces[i].e;
        last.east = pieces[i].east;
      }
    } else {
      merged.push({ ...pieces[i] });
    }
  }

  // The union is the complement of the largest uncovered gap on the circle.
  let maxGap = -1;
  let unionWest = merged[0].west;
  let unionEast = merged[merged.length - 1].east;
  for (let i = 0; i < merged.length; i++) {
    const cur = merged[i];
    const next = merged[(i + 1) % merged.length];
    const gap = i + 1 < merged.length ? next.s - cur.e : next.s + 360 - cur.e;
    if (gap > maxGap) {
      maxGap = gap;
      unionWest = next.west; // coverage resumes here (west), after the gap
      unionEast = cur.east; // coverage ends here (east), before the gap
    }
  }

  if (maxGap <= 0) {
    // Fully covered.
    return ensureBoundingBox([-180, south, 180, north]);
  }

  // Endpoints that fell exactly on the seam are at the antimeridian (±180).
  return ensureBoundingBox([unionWest ?? -180, south, unionEast ?? 180, north]);
}
