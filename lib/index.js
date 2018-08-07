const MultiLevelCache = require('./multi-level');
const MemoryStorage = require('./memory');
const FSStorage = require('./fs');

/**
 * @typedef {(Object|String|Number|Boolean|Date)} JSONSerializable
 */
/**
 * Creates a cache object to be used for an Out of Band Cache
 *
 * @param {Object} opts               - Options for the cache instance.
 * @param {String} [opts.fsCachePath] - The path to use for file-system caching. Disables FS caching if omitted.
 * @param {Number} opts.maxAge        - The duration in milliseconds before a cached item expires.
 * @param {Number} opts.maxStaleness  - The duration in milliseconds in which expired cache items are still served.
 * @returns {MultiLevelCache} a new cache object
 */
module.exports = function Cache(opts) {
  const caches = [
    new MemoryStorage()
  ];

  if (opts.fsCachePath) {
    caches.push(new FSStorage({ path: opts.fsCachePath }));
  }

  return new MultiLevelCache({
    maxAge: opts.maxAge,
    maxStaleness: opts.maxStaleness,
    caches
  });
};
