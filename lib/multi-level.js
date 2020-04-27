const debug = require('diagnostics')('out-of-band-cache:multi-level');


/**
 * Gets a property from either the options object if defined there, otherwise the default value.
 *
 * @param {Object} opts An options object
 * @param {String} key The name of the property to get
 * @param {Any} defaultValue The default value
 *
 * @private
 * @returns {Any} The value of the property
 */
function getValue(opts, key, defaultValue) {
  return key in opts ? opts[key] : defaultValue;
}

/**
 * @typedef Cache
 * @prop {AsyncFunction} init Initialization function
 * @prop {AsyncFunction} get Item retrieval function
 * @prop {AsyncFunction} set Item storage function
 * @prop {AsyncFunction} reset Cache clear function
 */

/**
 * @callback UpdateFn
 * @param {String} key The cache key
 * @param {JSONSerializable} staleValue if cached, value that is currently in the cache for this key
 * @returns {Promise<JSONSerializable>} Promise that resolves to the item value
 * @async
 */

/**
 * A multi-level cache.
 *
 * @param {Object} opts Options for the Client instance
 * @param {Number} [opts.maxAge=600000] The duration, in milliseconds, before a cached item expires (defaults to 600,000)
 * @param {Number} [opts.maxStaleness=0] The duration, in milliseconds, in which expired cache items are still served
 * @param {ShouldCache} [opts.shouldCache=()=>true] Function to determine whether to not we should cache the result
 * @param {Cache[]}  opts.caches An Array of cache objects. See `./fs` and `./memory` for sample caches.
 */
class MultiLevelCache {
  constructor(opts) {
    this._maxAge = opts.maxAge || (10 * 60 * 1000);
    this._maxStaleness = opts.maxStaleness || 0;
    this._caches = opts.caches;


    if (opts.shouldCache && typeof opts.shouldCache !== 'function') {
      throw new TypeError('shouldCache has to be a function');
    }
    this.shouldCache = opts.shouldCache || (() => true);

    this._pendingRefreshes = {};
    this._initTask = Promise.all(opts.caches.map(cache => cache.init()));
  }

  /**
   * Attempts a cache get
   *
   * @param {String} key The cache key
   * @param {Object} [opts={}] Options for this particular read
   * @param {Boolean} [opts.skipCache=false] Whether the cache should be bypassed (default false)
   * @param {String} [opts.maxAge] The duration in milliseconds before a cached item expires
   * @param {Number} [opts.maxStaleness] The duration, in milliseconds, in which expired cache items are still served
   * @param {ShouldCache} [opts.shouldCache] A function to determine whether or not we should cache the item
   * @param {UpdateFn} updateFn async function that defines how to get a new value
   *
   * @async
   * @returns {Promise<GetResult>} a Promise which resolves to an object containing
   * a `value` property and a `fromCache` boolean indicator.
   */
  async get(key, opts, updateFn) {
    opts = opts || {};
    if (opts.skipCache) {
      const value = await updateFn(key, null);
      return {
        value,
        fromCache: false
      };
    }

    await this._initTask;
    let item;
    try {
      item = await this._caches.reduce((getChain, cache) => {
        return getChain.catch(() => cache.get(key));
      }, Promise.reject(new Error('Invalid empty cache array')));
    } catch (e) { // cache miss
      return this._refresh(key, null, updateFn, opts);
    }

    // cache hit
    const now = Date.now();
    if (item.expiry < now) {
      if (item.expiry + getValue(opts, 'maxStaleness', this._maxStaleness) < now) {
        return this._refresh(key, item, updateFn, opts);
      }

      // Update the cache, but ignore failures
      this._refresh(key, item, updateFn, opts).catch(err => {
        debug('background refresh failed for %s with %s', key && JSON.stringify(key), err && err.message);
      });
    }

    return {
      value: item.value,
      fromCache: true
    };
  }

  /**
   * Clears each internal cache
   *
   * @async
   * @returns {Promise<void>} a Promise which resolves once all caches have cleared
   */
  reset() {
    return Promise.all(this._caches.map(cache => cache.reset()));
  }

  /**
   * Refresh the cache for a given key value pair. Pending refreshes are reused.
   *
   * @param {String} key cache key
   * @param {JSONSerializable} staleItem cache value
   * @param {UpdateFn} updateFn async function that defines how to get a new value
   * @param {Object} opts An options object
   * @param {ShouldCache} [opts.shouldCache] Function that determines whether or not we should cache the item
   * @param {Number} [opts.maxAge] The duration, in milliseconds, before a cached item expires
   *
   * @private
   * @async
   * @returns {Promise<any>} a promise that resolves once we have refreshed the correct key
   */
  async _refresh(key, staleItem, updateFn, opts = {}) {
    if (!(key in this._pendingRefreshes)) {
      this._pendingRefreshes[key] = this._forceRefresh(key, staleItem, updateFn, opts);
    }

    const value = await this._pendingRefreshes[key];
    return { value, fromCache: false };
  }

  /**
   * Refresh the cache for a given key value pair. Pending refreshes are ignored.
   *
   * @param {String} key cache key
   * @param {JSONSerializable} staleItem cache value
   * @param {UpdateFn} updateFn async function that defines how to get a new value
   * @param {Object} opts An options object
   * @param {ShouldCache} [opts.shouldCache] Function that determines whether or not we should cache the item
   * @param {Number} [opts.maxAge] The duration, in milliseconds, before a cached item expires
   *
   * @private
   * @async
   * @returns {Promise<any>} a promise that resolves once we have refreshed the correct key
   */
  async _forceRefresh(key, staleItem, updateFn, opts) {
    try {
      const value = await updateFn(key, staleItem && staleItem.value);
      const cacheItem = {
        value,
        expiry: Date.now() + getValue(opts, 'maxAge', this._maxAge)
      };
      const shouldCache = getValue(opts, 'shouldCache', this.shouldCache);
      if (typeof shouldCache !== 'function') {
        throw new TypeError('shouldCache has to be a function');
      }
      // Given that we are not ignoring this value, perform an out-of-band cache update
      if (shouldCache(cacheItem.value)) {
        // NB: an in-band update would `await` this Promise.all block
        Promise.all(this._caches.map(cache => cache.set(key, cacheItem))).catch(err => {
          throw new Error(`Error caching ${key}`, err);
        }).then(() => {
          delete this._pendingRefreshes[key];
        });
      } else {
        // just delete this right away because we're never caching the item
        delete this._pendingRefreshes[key];
      }
      return value;
    } catch (err) {
      delete this._pendingRefreshes[key];
      throw err;
    }
  }
}

module.exports = MultiLevelCache;
