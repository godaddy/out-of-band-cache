const path = require('path');
const rimraf = require('rimraf');
const assume = require('assume');
const MemoryCache = require('../lib/memory');
const FSCache = require('../lib/fs');

const cacheDir = path.resolve(__dirname, '../.cache');
function testInstance(constructor, opts) {
  let cache;

  return function () {
    beforeEach(function (done) {
      cache = new constructor(opts);

      rimraf(cacheDir, done);
    });

    it('init without any errors', async function () {
      await cache.init();
    });

    it('should set without any errors', async function () {
      await cache.init();
      await cache.set('abc', 123);
    });

    it('should get without any unexpected errors', async function () {
      await cache.init();
      await cache.set('abc', 123);
      let value = await cache.get('abc');
      assume(value).equals(123);

      const powers = { Superman: 'Strength', Flash: 'Speed', Batman: 'Money' };
      await cache.set('powers', powers);
      value = await cache.get('powers');
      assume(JSON.stringify(value)).equals(JSON.stringify(powers));
    });

    it('should throw an error when looking for an unknown key', async function () {
      await cache.init();
      let caught;

      try {
        await cache.get('what is love');
      } catch (err) {
        assume(err).exists();
        caught = true;
      }

      assume(caught).is.truthy();
    });

    it('should reset successfully', async function () {
      await cache.init();
      await cache.set('abc', 123);
      await cache.reset();

      let caught;
      try {
        await cache.get('abc');
      } catch (err) {
        assume(err).exists();
        caught = true;
      }

      assume(caught).is.truthy();

    });
  };
}

describe('API-level functionality', function () {
  describe('File System cache', testInstance(MemoryCache, {}));
  describe('In-memory cache', testInstance(FSCache, { path: cacheDir }));
});
