const assume = require('assume');
const Cache = require('../lib/memory');
const cacheTest = require('./cache');

describe('In-memory cache', function () {
  it('allows the cache to be pre-instantiated', function () {
    const cache = new Cache({ items: { abc: 123 } });
    assume(cache._items.abc).exists();
    assume(cache._items.abc).equals(123);
  });

  it('recreates the _items if they were manually deleted', async function () {
    const cache = new Cache();
    delete cache._items;
    assume(cache._items).does.not.exist();
    cache.init();
    assume(cache._items).exists();
  });

  it('generates an empty item on initialization', async function () {
    const cache = new Cache();
    assume(cache._items).exists();
    assume(cache._items).has.length(0);
  });

  it('can set an item', async function () {
    const cache = new Cache();
    await cache.set('abc', 123);
    assume(cache._items.abc).equals(123);
  });

  it('gets an item from memory if it exists', async function () {
    const cache = new Cache();
    await cache.set('abc', 123);

    const value = await cache.get('abc');
    assume(value).equals(123);
  });

  it('throw an error if the item is not found', async function () {
    const cache = new Cache();
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

  it('resets by clearing the items', async function () {
    const cache = new Cache();
    await cache.set('abc', 123);
    await cache.reset();
    assume(cache._items).has.length(0);
  });

  describe('API-level functionality', function () {
    const opts = {
      constructor: Cache
    };

    cacheTest(opts)();
  });
});
