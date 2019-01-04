const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const assume = require('assume');
const sinon = require('sinon');
const crypto = require('crypto');
const promisify = require('util').promisify;

const FSCache = require('../lib/fs');
const cacheTest = require('./cache');

const readdir = promisify(fs.readdir);


describe('File system cache', () => {
  const cacheDir = path.resolve(__dirname, '.cache');
  let createHashSpy = null;

  before(done => {
    rimraf(cacheDir, done);
  });

  beforeEach(() => {
    createHashSpy = sinon.spy(crypto, 'createHash');
  });

  afterEach(() => {
    createHashSpy.restore();
  });

  it('uses file names that are under 255 characters', async function () {
    const superLongKey = Array(300).fill('a').join('');
    const cache = new FSCache({ path: cacheDir });

    await cache.init();
    await cache.set(superLongKey, { dummy: 'data' });
    const files = await readdir(cacheDir);

    files.forEach(name => {
      assume(name.length).is.lessThan(255);
    });
  });

  it('avoids recomputing the same hash for the file name multiple times', async function () {
    const key = Array(300).fill('a').join('');
    const cache = new FSCache({ path: cacheDir });

    await cache.init();
    await cache.set(key, { dummy: 'data' });
    await cache.get(key);
    assume(createHashSpy.callCount).equals(1);
  });

  it('deletes the cache directory and the hash cache on reset', async function () {
    const cache = new FSCache({ path: cacheDir });
    await cache.init();

    await cache.set('stuff', { dummy: 'data' });
    await cache.reset();

    let caught;
    try {
      const files = await readdir(cacheDir);
      assume(files).has.length(1); // will crash because we reset the fs cache
    } catch (err) {
      caught = true;
      assume(err).exists();
    }

    assume(caught).is.truthy();
    assume(cache._hashCache).has.length(0);
  });

  describe('API-level functionality', function () {
    const opts = {
      beforeEach: function (done) {
        rimraf(cacheDir, done);
      },
      constructor: FSCache,
      builder: { path: cacheDir }
    };

    cacheTest(opts)();
  });
});
