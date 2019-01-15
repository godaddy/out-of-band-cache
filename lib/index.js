const MultiLevelCache = require('./multi-level');
const MemoryStorage = require('./memory');
const FSStorage = require('./fs');

/**
 * @typedef {(Object|String|Number|Boolean|Date)} JSONSerializable
 */

/**
 * @typedef GetResult
 * @prop {JSONSerializable} value The value of the cache item
 * @prop {Boolean} fromCache Whether the value was pulled from the cache or refreshed from the source API
 */

/**
 * @callback ShouldCache
 * @param {GetResult} a cache item that we are electing to cache (or not)
 * @returns {Boolean}
 */

/**
 * Creates a cache object to be used for an Out of Band Cache
 *
 * @param {Object} opts                           - Options for the cache instance.
 * @param {String} [opts.fsCachePath]             - The path to use for file-system caching. Disables FS caching if omitted.
 * @param {Number} opts.maxAge                    - The duration in milliseconds before a cached item expires.
 * @param {Number} opts.maxStaleness              - The duration in milliseconds in which expired cache items are still served.
 * @param {ShouldCache} [opts.shouldCache]        - Function to determine whether to not we should cache the result
 * @param {ShouldCache} [opts.fallback[Cache]]    - An array of additional caches provided by the consumer of the application
 * @returns {MultiLevelCache} a new cache object
 */
function Cache(opts) {
  let caches = [
    new MemoryStorage()
  ];

  if (opts.fsCachePath) {
    caches.push(new FSStorage({ path: opts.fsCachePath }));
  }

  if (opts.fallback) {
    caches.push(...opts.fallback);
  }

  if (opts.caches) {
    caches = opts.caches;
  }

  return new MultiLevelCache({
    maxAge: opts.maxAge,
    maxStaleness: opts.maxStaleness,
    caches,
    shouldCache: opts.shouldCache
  });
}

Cache.Memory = MemoryStorage;
Cache.File = FSStorage;

module.exports = Cache;
