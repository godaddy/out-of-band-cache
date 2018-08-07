const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const promisify = require('util').promisify;

const rimraf = promisify(require('rimraf'));
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * A Cache that uses the local file system as a cache
 */
class FileSystemCache {
  /**
   * @param {Object} opts       - Options for the Client instance
   * @param {Object} opts.path - The path to the directory to store file
   */
  constructor(opts) {
    this._path = opts.path;
    this._hashCache = {};
  }

  /**
   * Initializes the cache
   *
   * @returns {Promise<void>} a Promise which resolves when initialization has completed.
   */
  async init() {
    try {
      await mkdir(this._path, 0o744);
    } catch (err) {
      if (err !== 'EEXIST') {
        throw err;
      }
    }
  }

  /**
   * Tries to retrieve a cache item
   *
   * @param {String} key  - The cache key
   * @returns {Promise<JSONSerializable>} a Promise which resolves if an item was found,
   * or fails if no item exists or an error occurred.
   */
  async get(key) {
    const data = await readFile(this._getPath(key), 'utf8');
    return JSON.parse(data);
  }

  /**
   * Stores a cache item
   *
   * @param {String} key              - The cache key
   * @param {JSONSerializable} value  - The JSON-serializable value to store
   * @returns {Promise<void>} a Promise which resolves once storage completes, or fails if there is an error writing the file.
   */
  async set(key, value) {
    await writeFile(this._getPath(key), JSON.stringify(value), 'utf8');
  }

  /**
   * Clears the cache
   *
   * @returns {Promise<void>} a Promise which resolves once all cache files are deleted or fails if there was an error.
   */
  async reset() {
    await rimraf(path.join(this._path, '*'));
    this._hashCache = {};
  }

  /**
   * Generate a path given a key
   * @param  {string} key cache key
   * @returns {string} where the key exists on disk
   * @private
   */
  _getPath(key) {
    if (!(key in this._hashCache)) {
      const hash = crypto.createHash('sha256');
      hash.update(key);
      this._hashCache[key] = hash.digest('hex');
    }

    return path.join(this._path, this._hashCache[key]);
  }
}

module.exports = FileSystemCache;
