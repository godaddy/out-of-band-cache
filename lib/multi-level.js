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
 * @param {Object} opts                             - Options for the Client instance
 * @param {String} [opts.maxAge=600,000]            - The duration, in milliseconds, before a cached item expires
 * @param {String} [opts.maxStaleness=0]            - The duration, in milliseconds, in which expired cache items are still served
 * @param {ShouldCache} [opts.shouldCache=()=>true] - Function to determine whether to not we should cache the result
 * @param {Cache[]}  opts.caches                    - An Array of cache objects. See `./fs` and `./memory` for sample caches.
 */
class MultiLevelCache {
  constructor(opts) {
    this._maxAge = opts.maxAge || (10 * 60 * 1000);
    this._maxStaleness = opts.maxStaleness || 0;
    this._caches = opts.caches;
    this.shouldCache = opts.shouldCache || (() => true);

    this._pendingRefreshes = {};
    this._initTask = Promise.all(opts.caches.map(cache => {
      return cache.init().catch(err => {
        throw err;
      });
    }));
  }

  /**
   * Attempts a cache get
   *
   * @param {String}   key                    - The cache key
   * @param {Object}   opts                   - Options for this particular read
   * @param {Boolean}  [opts.skipCache=false] - Whether the cache should be bypassed (default false)
   * @param {String}   [opts.maxAge]          - The duration in milliseconds before a cached item expires
   * @param {ShouldCache} [opts.shouldCache]  - A function to determine whether or not we should cache the item
   * @param {UpdateFn} updateFn               - async function that defines how to get a new value
   *
   * @async
   * @returns {Promise<GetResult>} a Promise which resolves to an object containing
   * a `value` property and a `fromCache` boolean indicator.
   */
  async get(key, opts, updateFn) {
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
      }, Promise.reject());
    } catch (e) { // cache miss
      return this._refresh(key, null, updateFn, opts.shouldCache);
    }

    // cache hit
    const now = Date.now();
    if (item.expiry < now) {
      const refreshTask = this._refresh(key, item, updateFn, opts.shouldCache);
      if (item.expiry + this._maxStaleness < now) {
        return refreshTask;
      }
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
   * Refresh the cache for a given key value pair
   * @param  {String} key       cache key
   * @param  {JSONSerializable} staleItem cache value
   * @param  {UpdateFn} updateFn  async function that defines how to get a new value
   * @param  {ShouldCache} [shouldCache] function that determines whether or not we should cache the item
   *
   * @private
   * @async
   * @returns {Promise<any>} a promise that resolves once we have refreshed the correct key
   */
  async _refresh(key, staleItem, updateFn, shouldCache) {
    if (!(key in this._pendingRefreshes)) {
      try {
        const task = updateFn(key, staleItem && staleItem.value);
        this._pendingRefreshes[key] = task;

        const value = await task;
        const cacheItem = {
          value,
          expiry: Date.now() + this._maxAge
        };

        // Given that we are not ignoring this value, perform an out-of-band cache update
        const willCache = shouldCache || this.shouldCache;
        if (typeof willCache === 'function' && willCache(cacheItem.value)) {
          // NB: an in-band update would `await` this Promise.all block
          Promise.all(this._caches.map(cache => cache.set(key, cacheItem))).catch(err => {
            throw new Error(`Error caching ${key}`, err);
          }).then(() => {
            delete this._pendingRefreshes[key];
          });
        }

        return { value, fromCache: false };

      } catch (err) {
        delete this._pendingRefreshes[key];
        throw err;
      }
    }

    const value = await this._pendingRefreshes[key];
    return { value, fromCache: false };
  }
}

module.exports = MultiLevelCache;
