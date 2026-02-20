import urijs from 'urijs';

// Allow duplicate query parameters to preserve them as they are
urijs.duplicateQueryParameters = true;
// Use %20 instead of + for URL encoding, see https://github.com/radiantearth/stac-browser/issues/804
urijs.escapeQuerySpace = false;

export function URI(...args) {
  return urijs(...args);
}

/**
 * Checks whether a variable is a string and contains at least one character.
 * 
 * @param {*} string - A variable to check.
 * @returns {boolean} - `true` is the given variable is a string with length > 0, `false` otherwise.
 */
export function hasText(string) {
  return (typeof string === 'string' && string.length > 0);
}



/**
 * Computes the size of an array (number of array elements) or object (number of key-value-pairs).
 * 
 * Returns 0 for all other data types.
 * 
 * @param {*} obj 
 * @returns {integer}
 */
export function size(obj) {
  if (typeof obj === 'object' && obj !== null) {
    if (Array.isArray(obj)) {
      return obj.length;
    }
    else {
      return Object.keys(obj).length;
    }
  }
  return 0;
}

/**
 * Ensures a number is between a minimum and maximum value, but with a delta.
 * 
 * @param {number} num The number to check.
 * @param {number} min The minimum value.
 * @param {number} max The maximum value.
 * @param {number} delta The delta that the number is allowed to be larger or smaller.
 * @returns {number|null}
 */
export function ensureNumber(num, min, max, delta = 0.00000001) {
  if (typeof num !== 'number') {
    return null;
  }
  const min2 = min - delta;
  const max2 = max + delta;
  if (num < min2 || num > max2) {
    return null;
  }

  return Math.min(Math.max(num, min), max);
}

/**
 * Checks whether a variable is a real object or not.
 * 
 * This is a more strict version of `typeof x === 'object'` as this example would also succeed for arrays and `null`.
 * This function only returns `true` for real objects and not for arrays, `null` or any other data types.
 * 
 * @param {*} obj - A variable to check.
 * @returns {boolean} - `true` is the given variable is an object, `false` otherwise.
 */
export function isObject(obj) {
  return (typeof obj === 'object' && obj === Object(obj) && !Array.isArray(obj));
}

/**
 * Merges any number of arrays of objects.
 * 
 * @param  {...Array.<Object>} bands 
 * @returns {Array.<Object>}
 */
export function mergeArraysOfObjects(...bands) {
  bands = bands.filter(arr => Array.isArray(arr));
  if (bands.length > 1) {
    let length = Math.max(...bands.map(arr => arr.length));
    let merged = [];
    for(let i = 0; i < length; i++) {
      merged.push(Object.assign({}, ...bands.map(band => band[i])));
    }
    return merged;
  }
  else if (bands.length === 1) {
    return bands[0];
  }
  return [];
}

/**
 * Get minimum values for the STAC data types.
 * 
 * Currently only supports int types.
 * 
 * @private
 * @todo Add float support
 * @param {string} str Data type
 * @returns {number|null} Minimum value
 */
export function getMinForDataType(str) {
  switch(str) {
    case "int8":
      return -128;
    case "int16":
      return -32768;
    case "int32":
      return -2147483648;
  }
  if (str.startsWith("u")) {
    return 0;
  }
  return null;
}

/**
 * Get maximum values for the STAC data types.
 * 
 * Currently only supports int types.
 * 
 * @private
 * @todo Add float support
 * @param {string} str Data type
 * @returns {number|null} Maximum value
 */
export function getMaxForDataType(str) {
  switch(str) {
    case "int8":
      return 127;
    case "uint8":
      return 255;
    case "int16":
      return 32767;
    case "uint16":
      return 65535;
    case "int32":
      return 2147483647;
    case "uint32":
      return 4294967295;
  }
  return null;
}


/**
 * Gets the reported minimum and maximum values for a STAC object.
 * 
 * Searches through different extension fields in raster, classification, and file.
 * 
 * @param {StacObject} object 
 * @returns {Statistics}
 */
export function getMinMaxValues(object) {
  /**
   * Statistics
   * 
   * @typedef {Object} Statistics
   * @property {number|null} minimum Minimum value
   * @property {number|null} maximum Maximum value
   */
  const stats = {
    minimum: null,
    maximum: null
  };

  // Checks whether the stats object is completely filled
  const isComplete = obj => obj.minimum !== null && obj.maximum !== null;

  // data sources: raster (statistics, histogram, data_type), classification, file (values, data_type)
  const statistics = object.getMetadata("statistics");
  if (isObject(statistics)) {
    if (typeof statistics.minimum === 'number') {
      stats.minimum = statistics.minimum;
    }
    if (typeof statistics.maximum === 'number') {
      stats.maximum = statistics.maximum;
    }
    if (isComplete(stats)) {
      return stats;
    }
  }

  const histogram = object.getMetadata("raster:histogram");
  if (isObject(histogram)) {
    if (typeof histogram.min === 'number') {
      stats.minimum = histogram.min;
    }
    if (typeof histogram.max === 'number') {
      stats.maximum = histogram.max;
    }
    if (isComplete(stats)) {
      return stats;
    }
  }

  const classification = object.getMetadata("classification:classes");
  if (Array.isArray(classification)) {
    classification.reduce((obj, cls) => {
      obj.minimum = Math.min(obj.minimum, cls.value);
      obj.maximum = Math.max(obj.maximum, cls.value);
      return obj;
    }, stats);
    if (isComplete(stats)) {
      return stats;
    }
  }

  const values = object.getMetadata("file:values");
  if (Array.isArray(values)) {
    values.reduce((obj, map) => {
      obj.minimum = Math.min(obj.minimum, ...map.values);
      obj.maximum = Math.max(obj.maximum, ...map.values);
      return obj;
    }, stats);
    if (isComplete(stats)) {
      return stats;
    }
  }

  const data_type = object.getMetadata("data_type");
  if (data_type) {
    stats.minimum = getMinForDataType(data_type);
    stats.maximum = getMaxForDataType(data_type);
  }

  return stats;
}

/**
 * Gets the reported no-data values for a STAC Object.
 * 
 * Searches through different extension fields in nodata, classification, and file.
 * 
 * @param {StacObject} object 
 * @returns {Array.<*>}
 */
export function getNoDataValues(object) {
  // data sources: raster (nodata), classification (nodata flag), file (nodata)
  let nodata = [];
  const common = object.getMetadata("nodata");
  if (typeof common !== 'undefined') {
    nodata.push(common);
  }
  else {
    const file = object.getMetadata("file:nodata");
    if (typeof file !== 'undefined') {
      nodata = file;
    }
    else {
      const classification = object.getMetadata("classification:classes");
      if (Array.isArray(classification)) {
        nodata = classification
          .filter(cls => Boolean(cls.nodata))
          .map(cls => cls.value);
      }
    }
  }

  return nodata.map(value => {
    if (value === "nan") {
      return NaN;
    }
    else if (value === "+inf") {
      return +Infinity;
    }
    else if (value === "-inf") {
      return -Infinity;
    }
    else {
      return value;
    }
  });
}
