import _Cache = require('out-of-band-cache');
import Cache from 'out-of-band-cache';
import path from 'path';

const cache = new Cache({
  maxAge: 10 * 60 * 1000, // cache items for 10 minutes
  maxStaleness: 60 * 60 * 1000, // Still serve expired cache items for 1 hour
});

const _cache = new _Cache({
  maxAge: 10 * 60 * 1000, // cache items for 10 minutes
  maxStaleness: 60 * 60 * 1000, // Still serve expired cache items for 1 hour
});

const cache2 = new Cache({
  maxAge: 10 * 60 * 1000,
  maxStaleness: 60 * 60 * 1000,
  fsCachePath: path.join(__dirname, '.cache'),
});

const _cache2 = new _Cache({
  maxAge: 10 * 60 * 1000,
  maxStaleness: 60 * 60 * 1000,
  fsCachePath: path.join(__dirname, '.cache'),
});
