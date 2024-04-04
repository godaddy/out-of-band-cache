const LRU = require('lru-cache');

/**
 * A Cache that stores items in-memory with a Least Recently Used (LRU) eviction policy
 */
class LRUCache {
  /**
  * @param {Object} [opts]          - Options for the Client instance
  * @param {Object} [opts.items]    - Items to pre-populate in the cache
  * @param {number} [opts.maxItems] - Maximum items to retain in the cache
  * @param {number} [opts.maxAge]   - Age in milliseconds before an item expires
  */
  constructor({ items = {}, maxItems, maxAge } = {}) {
    if (typeof maxItems !== 'number' || maxItems < 1) {
      throw new Error('max option is required and must be a positive integer');
    }

    this._items = new LRU({ max: maxItems, maxAge });

    for (const [key, value] of Object.entries(items)) {
      this._items.set(key, value);
    }
  }

  /**
   * Initializes the cache
   *
   * @returns {Promise<void>} a Promise which resolves once initialization completes
   */
  async init() {
    // We synchronously initialized the cache, so we don't have to do anything
  }

  /**
   * Tries to retrieve a cache item
   *
   * @param {String} key  - The cache key
   * @returns {Promise<JSONSerializable>} a Promise which resolves if an item was found or fails if no item exists.
   */
  async get(key) {
    if (this._items.has(key)) {
      return this._items.get(key);
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
    this._items.set(key, value);
  }

  /**
   * Clears the cache
   */
  reset() {
    this._items.reset();
  }
}

module.exports = LRUCache;
