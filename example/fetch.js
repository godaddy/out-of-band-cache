const Cache = require('../');
const crossFetch = require('cross-fetch');

class APIClient {
  constructor() {
    const options = {
      maxAge: 10 * 60 * 1000, // Cache items for 10 minutes
      maxStaleness: 60 * 60 * 1000, // Still serve expired cache items for 1 hour
      fsCachePath: path.join(__dirname, '.cache') // Fallback to a file-based cash located in .cache
    };

    this.cache = new Cache(options);
  }

  async get(url) {
    return await this.cache.get(url, {}, this.fetch);
  }

  async fetch(url) {
    const res = await crossFetch(url);
    return await res.json();
  }
}
