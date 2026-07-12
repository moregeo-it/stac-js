# Antimeridian test fixtures

The files in `input/` and `output/` are copied from the test suite of the
Python [antimeridian](https://github.com/gadomski/antimeridian) package
(`tests/data/`), which is licensed under the Apache License 2.0.

Notes:

- Symbolic links in the upstream `output/spherical/` directory (used for
  fixtures that are identical in flat and spherical mode) have been resolved
  to regular files.
- `input/issues-182.json` (an invalid polygon) is not included: detecting and
  repairing invalid geometries requires GEOS/shapely and is not supported by
  the JavaScript port (see the limitations in `src/antimeridian.js`).
- `input/stac-browser-736.json` is not from the upstream test suite. It is the
  geometry from https://github.com/radiantearth/stac-browser/issues/736, a
  real-world polygon crossing the antimeridian with longitudes > 180.

The fixtures are used by `tests/antimeridian-fixtures.test.js` and are
excluded from prettier formatting to stay identical to the upstream files.
