import { geotiffMediaTypes, isMediaType } from './mediatypes.js';
import { isObject, hasText } from './utils.js';
import STACHypermedia from './hypermedia.js';
import { getBest } from './locales.js';

/**
 * Class for STAC spec entities (Item, Catalog and Collection).
 * 
 * Don't instantiate this class!
 * 
 * @interface
 * @param {Object} data The STAC object
 * @param {string|null} absoluteUrl Absolute URL of the STAC object
 * @param {Object.<string, function>} keyMap Keys and functions that convert the values to stac-js objects.
 * @param {Array.<string>} privateKeys Keys that are private members of the stac-js objects (for cloning and export).
 */
class STAC extends STACHypermedia {

  constructor(data, absoluteUrl = null, keyMap = {}, privateKeys = []) {
    super(data, absoluteUrl, keyMap, privateKeys);
  }

  /**
   * Returns a single temporal extent for the STAC entity.
   * 
   * @returns {Array.<Date|null>|null}
   */
  getTemporalExtent() {
    return null;
  }

  /**
   * Returns the temporal extent(s) for the STAC entity.
   * 
   * @returns {Array.<Array.<Date|null>>}
   */
  getTemporalExtents() {
    return [];
  }

  /**
   * Get the "best" link for a specific locale (with fallback).
   * 
   * @param {string} locale 
   * @param {?string} fallbackLocale 
   * @returns {Link|null} The link with the given locale or null if not found.
   * @see {@link getBest}
   */
  getLocaleLink(locale, fallbackLocale = null) {
    let links = this.getStacLinksWithRel('alternate')
      .filter(link => hasText(link.hreflang));
    
    let available;
    if (Array.isArray(this.languages)) {
      available = this.languages.map(l => l.code);
    }
    else {
      available = links.map(link => link.hreflang);
    }
    
    let best = getBest(available, locale, fallbackLocale);
    return links.find(link => link.hreflang === best) || null;
  }

  /**
   * Get the icons from the links in a STAC entity.
   * 
   * @param {boolean} allowUndefined 
   * @returns {Array.<Link>}
   */
  getIcons(allowUndefined = true) {
    return this.getLinksWithRels(['icon'])
      .filter(img => img.canBrowserDisplayImage(allowUndefined));
  }

  /**
   * Get the thumbnails from the assets and links in a STAC entity.
   * 
   * @param {boolean} browserOnly - Return only images that can be shown in a browser natively (PNG/JPG/GIF/WEBP + HTTP/S).
   * @param {string|null} prefer - If not `null` (default), prefers a role over the other. Either `thumbnail` or `overview`.
   * @returns {Array.<STACReference>} Asset or Link
   */
  getThumbnails(browserOnly = true, prefer = null) {
    let thumbnails = this.getAssets().filter(asset => asset.isPreview());
    // Get from links only if no assets are available as they should usually be the same as in assets
    if (thumbnails.length === 0) {
      thumbnails = this.getLinks().filter(link => link.isPreview());
    }
    // Some old catalogs use just a asset key
    if (thumbnails.length === 0) {
      const thumbnail = this.getAsset("thumbnail");
      if (thumbnail) {
        thumbnails.push(thumbnail);
      }
    }
    if (browserOnly) {
      // Remove all images that can't be displayed in a browser
      thumbnails = thumbnails.filter(img => img.canBrowserDisplayImage());
    }
    if (prefer && thumbnails.length > 1) {
      // Prefer one role over the other.
      // The two step approach with two filters ensures the same sort bevahiour across all browsers:
      // see https://github.com/radiantearth/stac-browser/issues/370
      let filter = img => (Array.isArray(img.roles) && img.roles.includes(prefer)) || (img.getKey() === prefer);
      thumbnails = thumbnails
        .filter(filter)
        .concat(thumbnails.filter(img => !filter(img)));
    }
    return thumbnails;
  }

  /**
   * Determines the default GeoTiff asset for visualization.
   * 
   * @param {boolean} httpOnly Return only GeoTiffs that can be accessed via HTTP(S)
   * @param {boolean} cogOnly Return only COGs
   * @returns {Asset} Default GeoTiff asset
   * @see {rankGeoTIFFs}
   */
  getDefaultGeoTIFF(httpOnly = true, cogOnly = false) {
    let scores = this.rankGeoTIFFs(httpOnly, cogOnly);
    return scores[0]?.asset;
  }

  /**
   * Object with an asset and the corresponding score.
   * 
   * @typedef {Object} AssetScore
   * @property {Asset} asset
   * @property {number} score
   */

  /**
   * A function that can influence the score.
   * 
   * Returns a relative addition to the score.
   * Negative values subtract from the score.
   * 
   * @callback STAC~rankGeoTIFFs
   * @param {Asset} asset The asset to calculate the score for.
   */

  /**
   * Ranks the GeoTiff assets for visualization purposes.
   * 
   * The score factors can be found below:
   * - Roles/Keys (by default) - if multiple roles apply only the highest score is added:
   *   - overview => +3
   *   - thumbnail => +2
   *   - visual => +2
   *   - data => +1
   *   - none of the above => no change
   * - Other factors:
   *   - media type is COG: +2 (if cogOnly = false)
   *   - has RGB bands: +1
   *   - additionalCriteria: +/- a custom value
   * 
   * @param {boolean} httpOnly Return only GeoTiffs that can be accessed via HTTP(S)
   * @param {boolean} cogOnly Return only COGs
   * @param {Object.<string, number>} roleScores Roles (and keys) considered for the scoring. They key is the role name, the value is the score. Higher is better. Defaults to the roles and scores detailed above. An empty object disables role-based scoring.
   * @param {STAC~rankGeoTIFFs} additionalCriteria A function to customize the score by adding/subtracting.
   * @returns {Array.<AssetScore>} GeoTiff assets sorted by score in descending order.
   */
  rankGeoTIFFs(httpOnly = true, cogOnly = false, roleScores = null, additionalCriteria = null) {
    if (!isObject(roleScores)) {
      roleScores = {
        data: 1, 
        visual: 2,
        thumbnail: 2,
        overview: 3
      };
    }
    let scores = [];
    let assets = this.getAssetsByTypes(geotiffMediaTypes);
    if (httpOnly) {
      assets = assets.filter(asset => asset.isHTTP() && (!cogOnly || asset.isCOG()));
    }
    let roles = Object.entries(roleScores);
    for(let asset of assets) {
      let score = 0;
      if (roles.length > 0) {
        let result = roles
          .filter(([role]) => asset.hasRole(role, true)) // Remove all roles that don't exist in the asset
          .map(([,value]) => value); // Map to the scores
        if (result.length > 0) {
          score += Math.max(...result); // Add the highest of the scores
        }
      }
      if (!cogOnly && asset.isCOG()) {
        score += 2;
      }
      if (asset.findVisualBands()) {
        score += 1;
      }
      if (typeof additionalCriteria === 'function') {
        score += additionalCriteria(asset);
      }

      scores.push({asset, score});
    }
    scores.sort((a,b) => b.score - a.score);
    return scores;
  }

  /**
   * The single-band assets for RGB composites.
   * 
  * @typedef {Object} VisualAssets
  * @property {Band} red The red band with its index
  * @property {Band} green The green band with its index
  * @property {Band} blue The blue band with its index
  */

  /**
   * Find the single-band assets for RGB.
   * 
   * @returns {VisualAssets|null} Object with the RGB bands or null
   */
  findVisualAssets() {
    let rgb = {
      red: null,
      green: null,
      blue: null
    };
    let names = Object.keys(rgb);
    let assets = this.getAssets();
    for(let asset of assets) {
      let result = asset.findBand(names, 'eo:common_name');
      if (result) {
        rgb[result["eo:common_name"]] = asset;
      }
    }
    let complete = Object.values(rgb).every(o => o !== null);
    return complete ? rgb : null;
  }

  /**
   * 
   * @todo
   * @param {string} key
   * @returns {Asset|null}
   */
  getAsset(key) {
    if (!isObject(this.assets)) {
      return null;
    }
    return this.assets[key] || null;
  }

  /**
   * 
   * @todo
   * @returns {Array.<Asset>}
   */
  getAssets() {
    if (!isObject(this.assets)) {
      return [];
    }
    return Object.values(this.assets);
  }

  /**
   * Returns all assets that contain at least one of the given roles.
   * 
   * @param {string|Array.<string>} roles One or more roles.
   * @param {boolean} includeKey Also returns `true` if the asset key equals to one of the given roles.
   * @returns {Array.<Asset>} The assets with the given roles.
   */
  getAssetsWithRoles(roles, includeKey = false) {
    return this.getAssets().filter(asset => asset.hasRole(roles, includeKey));
  }

  /**
   * 
   * @todo
   * @param {string} role 
   * @param {boolean} includeKey 
   * @returns {Asset|null}
   */
  getAssetWithRole(role, includeKey = false) {
    let assets = this.getAssetsWithRoles([role], includeKey);
    return assets[0] || null;
  }

  /**
   * 
   * @todo
   * @param {Array.<string>} types 
   * @returns {Array.<Asset>}
   */
  getAssetsByTypes(types) {
    return this.getAssets().filter(asset => isMediaType(asset.type, types));
  }

  /**
   * @deprecated Use `is` instead.
   * @param {*} other 
   * @returns {boolean}
   */
  equals(other) {
    return this.is(other);
  }

  /**
   * Checks whether another object is the same STAC entity as this one.
   * 
   * It doesn't check for deep equality, but whether they are likely the same entity based on their type and id/URL.
   * 
   * @param {*} other 
   * @returns {boolean}
   */
  is(other) {
    if (this === other) {
      return true;
    }
    if (!(other instanceof STAC)) {
      return false;
    }
    if (this.getObjectType() !== other.getObjectType()) {
      return false;
    }
    if (this.id && this.id === other.id) {
      return true;
    }
    else if (this.absoluteUrl && this.absoluteUrl === other.absoluteUrl) {
      return true;
    }
    return false;
  }

  /**
   * Checks whether a specific extension is implemented.
   * 
   * The pattern can contain `*` as a wildcard, e.g. for version numbers.
   * 
   * @param {string} pattern The extension URI to check for.
   * @returns {boolean} `true` if the extension is implemented, `false` otherwise.
   */
  supportsExtension(pattern) {
    if (!Array.isArray(this.stac_extensions)) {
      return false;
    }
    let regexp = new RegExp('^' + pattern.replaceAll('*', '[^/]+') + '$');
    return this.stac_extensions.some(uri => regexp.test(uri));
  }

}

export default STAC;
