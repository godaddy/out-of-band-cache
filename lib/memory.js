/**
 * A Cache that stores items in-memory
 */
class MemoryCache {
  /**
  * @param {Object} [opts]       - Options for the Client instance
  * @param {Object} [opts.items] - Items in the cache
  */
  constructor(opts) {
    opts = opts || {};
    this._items = opts.items || {};
  }

  /**
   * Initializes the cache
   *
   * @returns {Promise<void>} a Promise which resolves once initialization completes
   */
  async init() {
    this._items = this._items || {};
  }

  /**
   * Tries to retrieve a cache item
   *
   * @param {String} key  - The cache key
   * @returns {Promise<JSONSerializable>} a Promise which resolves if an item was found or fails if no item exists.
   */
  async get(key) {
    if (key in this._items) {
      return this._items[key];
    }

    throw new Error('Key not found');
  }

  /**
   * Stores a cache item
   *
   * @param {String} key    - The cache key
   * @param {JSONSerializable} value  - The JSON-serializable value to store
   *
   * @returns {Promise<void>} a Promise which resolves once storage completes.
   */
  async set(key, value) {
    this._items[key] = value;
  }

  /**
   * Clears the cache
   */
  reset() {
    this._items = {};
  }
}

module.exports = MemoryCache;
