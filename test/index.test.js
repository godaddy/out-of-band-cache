/* eslint max-statements: 0 */
const path = require('path');
const assume = require('assume');
const Cache = require('../lib/');
const rimraf = require('rimraf');
const sinon = require('sinon');

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}
const simpleGet = async i => i;

describe('Out of Band cache', () => {
  const cachePath = path.resolve(__dirname, '../.cache');

  beforeEach(done => {
    rimraf(cachePath, done);
  });

  it('exposes persistence caches on the top level export', function () {
    assume(Cache.File).exists();
    assume(Cache.LRU).exists();
    assume(Cache.Memory).exists();
  });

  it('does not prevent a failed request from being retried later on', async function () {
    const cache = new Cache({
      maxAge: 60 * 60 * 1000,
      fsCachePath: cachePath,
      maxStaleness: 60 * 60 * 1000
    });
    let value;

    async function willCrash() {
      await cache.get('some-key', {}, async (key, staleItem) => {
        assume(key).equals('some-key');
        assume(staleItem).is.falsey();
        throw new Error('Aaaa!');
      });
    }

    try {
      await willCrash();
    } catch (e) {
      assume(e).matches(/Aaaa!/);
    }

    value = await cache.get('some-key', {}, async () => 'Some value');
    assume(value).deep.equals({ fromCache: false, value: 'Some value' });

    async function willAlsoCrash() {
      return await cache.get('some-key', {}, async () => {
        throw new Error('Got unexpected cache miss');
      });
    }

    try {
      value = await willAlsoCrash();
    } catch (e) {
      assume(e).to.be.truthy();
    }

    assume(value).deep.equals({ fromCache: true, value: 'Some value' });
  });

  it('always provides at least 1 cache', function () {
    const justMemory = new Cache({});
    assume(justMemory._caches).has.length(1);

    const withFile = new Cache({ fsCachePath: cachePath });
    assume(withFile._caches).has.length(2);
  });

  it('uses an LRU cache if maxMemoryItems is set', async function () {
    const getter = sinon.spy();

    const cache = new Cache({ maxMemoryItems: 2, fsCachePath: null });
    await cache.get('a', {}, () => 1);
    await cache.get('b', {}, () => 2);
    await cache.get('c', {}, () => 3);

    await cache.get('c', {}, getter);
    assume(getter.called).is.falsy();

    await cache.get('a', {}, getter);
    assume(getter.called).is.truthy();
  });

  describe('get', function () {
    it('never uses the cache if we specifically want to skip it', async function () {
      const skipper = new Cache({});

      const first = await skipper.get('data', {}, simpleGet);
      const second = await skipper.get('data', { skipCache: true }, simpleGet);
      const third = await skipper.get('data', {}, simpleGet);

      assume(first.fromCache).is.falsey();
      assume(second.fromCache).is.falsey();
      assume(third.fromCache).is.truthy();
    });

    it('refreshes on a previously uncached key', async function () {
      const uncached = new Cache({});
      uncached._refresh = async (key) => {
        assume(key).equals('data');
        return true;
      };

      const calledRefresh = await uncached.get('data', {});
      assume(calledRefresh).is.truthy();
    });

    it('can override the cache-level maxAge', async function () {
      const fridge = new Cache({ maxAge: -10, maxStaleness: -10 }); // items are immediately stale
      await fridge.get('good milk', { maxAge: 1000 }, async () => 'milk');
      const milk = await fridge.get('good milk', { }, async () => { throw new Error('gross'); });
      assume(milk.fromCache).is.truthy();
    });

    it('refreshes on an expired item', async function () {
      const fridge = new Cache({ maxAge: -10, maxStaleness: -10 }); // items are immediately stale

      await fridge.get('old milk', {}, simpleGet);
      await sleep(100);
      const expired = await fridge.get('old milk', { }, simpleGet);

      assume(expired.fromCache).is.falsey();
    });

    it('refreshes on an expired item, but returns stale if within staleness', async function () {
      const fridge = new Cache({ maxAge: -10, maxStaleness: 1000 }); // items are immediately stale

      await fridge.get('old milk', {}, async () => 'milk');
      await sleep(100);
      const expired = await fridge.get('old milk', { }, async () => { throw new Error('gross'); });

      assume(expired.fromCache).is.truthy();
      assume(expired.value).to.equal('milk');
    });

    it('refreshes on an expired item, but returns stale if infinite staleness', async function () {
      const fridge = new Cache({ maxAge: -10, maxStaleness: Infinity }); // items are immediately stale

      await fridge.get('old milk', {}, async () => 'milk');
      await sleep(100);
      const expired = await fridge.get('old milk', { }, async () => { throw new Error('gross'); });

      assume(expired.fromCache).is.truthy();
      assume(expired.value).to.equal('milk');
    });

    it('can override the cache-level maxStaleness', async function () {
      const fridge = new Cache({ maxAge: -10, maxStaleness: -10 }); // items are immediately stale

      await fridge.get('old milk', {}, async () => 'milk');
      await sleep(100);
      const expired = await fridge.get('old milk', { maxStaleness: 1000 }, async () => { throw new Error('gross'); });

      assume(expired.fromCache).is.truthy();
      assume(expired.value).to.equal('milk');
    });

    it('does not add an item to the cache if preconfigured not to', async function () {
      const dopey = new Cache({ shouldCache: () => false });

      await dopey.get('diamond', {}, simpleGet);
      assume(dopey._caches[0]._items).has.length(0);
    });

    it('does not add an item if we supply shouldCache as a get option', async function () {
      const dopey = new Cache({});

      await dopey.get('diamond', { shouldCache: () => false }, simpleGet);
      assume(dopey._caches[0]._items).has.length(0);
    });

    it('does not add an item if it fails shouldCache', async function () {
      const dopey = new Cache({ shouldCache: v => v !== 'words' });
      // dopey doesn't know how to speak so he doesn't remember any words

      await dopey.get('sounds', {}, simpleGet);
      await dopey.get('words', {}, simpleGet);
      await dopey.get('diamonds', {}, simpleGet);
      assume(dopey._caches[0]._items).has.length(2);
    });

    it('only sets the cache values with shouldCache is a function', async function () {
      let wonderland = new Cache({});
      let errors = 0;

      // default
      await wonderland.get('tweedle-dee', {}, simpleGet);
      assume(wonderland._caches[0]._items).has.length(1);

      // boolean
      try {
        await wonderland.get('tweedle-dum', { shouldCache: true }, simpleGet);
      } catch (e) {
        assume(e).matches(/shouldCache has to be a function/);
        errors++;
      }

      assume(errors).equals(1);
      assume(wonderland._caches[0]._items).has.length(1);

      // string
      try {
        await wonderland.get('bandersnatch', { shouldCache: 'totally a function' }, simpleGet);
      } catch (e) {
        assume(e).matches(/shouldCache has to be a function/);
        errors++;
      }

      assume(errors).equals(2);
      assume(wonderland._caches[0]._items).has.length(1);

      // function
      await wonderland.get('jabberwocky', { shouldCache: () => true }, simpleGet);
      assume(wonderland._caches[0]._items).has.length(2);

      // in the constructor
      try {
        wonderland = new Cache({ shouldCache: 'definitely a function' });
      } catch (e) {
        assume(e).matches(/shouldCache has to be a function/);
        errors++;
      }

      assume(errors).equals(3);
    });

    it('does not set a cache item, even if we do it first', async function () {
      const eventually = new Cache({});

      await eventually.get('not yet', { skipCache: () => false }, simpleGet);
      assume(eventually._caches[0]._items).has.length(0);

      await eventually.get('not yet', {}, simpleGet);
      await eventually.get('now', {}, simpleGet);
      assume(eventually._caches[0]._items).has.length(2);
    });
  });

  describe('_refresh', function () {
    it('immediately returns an existing pending refresh', async function () {
      const cache = new Cache({});
      cache._pendingRefreshes.nuclearLaunchCodes = 12345;
      const stub = sinon.stub();

      const value = await cache._refresh('nuclearLaunchCodes', null, stub, {});
      assume(JSON.stringify(value)).equals(JSON.stringify({ value: 12345, fromCache: false }));
      assume(stub.called).is.falsey();
    });

    it('deletes a pending refresh if the getter crashes', async function () {
      const cache = new Cache({});
      const badGetter = async () => {
        throw new Error('that was no bueno');
      };

      let caught;
      try {
        await cache._refresh('data', null, badGetter, {});
      } catch (err) {
        caught = true;
        assume(err).matches('that was no bueno');
        assume(cache._pendingRefreshes.data).does.not.exist();
      }

      assume(caught).is.truthy();
    });

    it('gradually removes each pending request as they complete', async function () {
      const cache = new Cache({});

      const slowGetter = async (i) => {
        await sleep(500);
        return i;
      };

      const tasks = Array(10).fill(0).map((_, i) => {
        // no await because we want to proceed before they resolve
        return cache._refresh(i, null, slowGetter, {});
      });

      assume(Object.entries(cache._pendingRefreshes)).has.length(10);

      await Promise.all(tasks);
      assume(Object.entries(cache._pendingRefreshes)).has.length(0);
    });
  });

  describe('reset', function () {
    it('restores every cache', async function () {
      const resetti = new Cache({});
      await resetti.get('save file', {}, simpleGet);
      await resetti.get('unsaved file', {}, simpleGet);
      assume(resetti._caches[0]._items).has.length(2);
      await resetti.reset();
      assume(resetti._caches[0]._items).has.length(0);
    });
  });
});
