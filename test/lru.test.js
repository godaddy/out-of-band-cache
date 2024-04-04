const assume = require('assume');
const { LRU } = require('../lib');
const cacheTest = require('./cache');

describe('LRU cache', function () {
  it('requires a max option', async function () {
    let caught = false;

    try {
      // eslint-disable-next-line no-new
      new LRU();
    } catch (err) {
      caught = true;
    }

    assume(caught).is.truthy();
  });

  it('gets an item from memory if it exists', async function () {
    const cache = new LRU({ maxItems: 10 });
    await cache.set('abc', 123);

    const value = await cache.get('abc');
    assume(value).equals(123);
  });

  it('throws an error if the item is not found', async function () {
    const cache = new LRU({ maxItems: 10 });
    let caught = false;

    try {
      await cache.get('to the choppa');
    } catch (err) {
      caught = true;
      assume(err).exists();
      assume(err).matches('Key not found');
    }

    assume(caught).is.truthy();
  });

  it('evacuates least recently used items', async function () {
    const cache = new LRU({ maxItems: 2 });
    await cache.set('a', 1);
    await cache.set('b', 2);
    await cache.get('a');

    await cache.set('c', 3);
    const valueA = await cache.get('a');
    assume(valueA).equals(1);
    const valueC = await cache.get('c');
    assume(valueC).equals(3);

    let caught;
    try {
      await cache.get('b');
    } catch (err) {
      caught = true;
      assume(err).matches('Key not found');
    }
    assume(caught).is.truthy();
  });

  describe('API-level functionality', function () {
    const opts = {
      constructor: LRU,
      builder: {
        maxItems: 100
      }
    };

    cacheTest(opts)();
  });
});
