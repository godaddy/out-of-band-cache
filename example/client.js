/* eslint-disable no-console */
const Cache = require('../');
const path = require('path');

/**
 * Wait an arbitrary number of milliseconds before resolving. This is super
 * helpful for reliably testing long, tedious network requests in async functions
 *
 * @param  {Number} ms number of milliseconds to wait
 * @returns {Promise} Promise resolves after a ms milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class APIClient {
  constructor() {
    const options = {
      maxAge: 10 * 60 * 1000, // cache items for 10 minutes
      maxStaleness: 60 * 60 * 1000, // Still serve expired cache items for 1 hour
      fsCachePath: path.join(__dirname, '.cache') // fallback to a file-based cash located in .cache
    };

    this.cache = new Cache(options);
  }

  /**
   * Get some data from an API
   *
   * @async
   * @returns {Promise<void>} a Promise that resolves when we are finished getting data from the "API".
   */
  async get() {
    const now = Date.now();
    const skipCache = {}; // don't skip the cache, if you ALWAYS wanted to get new data you can use the following line
    // const skipCache = { skipCache: true }
    const airShieldLockCode = await this.cache.get('data', skipCache, this.getAirShieldLockCode);
    console.log(`Fetched ${JSON.stringify(airShieldLockCode)} in ${Date.now() - now}ms`);
  }

  /**
   * Reset the cache in case we need to clear the current data.
   * @returns {Promise} [description]
   */
  async reset() {
    await this.cache.reset();
  }

  /**
   * @returns {Promise<number>} Promise that resolves to data from an "API".
   * @async
   */
  async getAirShieldLockCode() {
    // simulate a long, slow process that can be cached
    await sleep(2 * 1000);

    return { code: 123465, planet: 'Druidia' };
  }
}

async function makeRequests() {
  const client = new APIClient();

  // will be slow
  await client.get();

  // will now be much faster now that we've cached the response
  await client.get();
  await client.get();
  await client.get();

  // reset the cache
  await client.reset();

  // will be slow again
  await client.get();
}

makeRequests();
