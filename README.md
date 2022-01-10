# `out-of-band-cache`

[![Version npm](https://img.shields.io/npm/v/out-of-band-cache.svg?style=flat-square)](https://www.npmjs.com/package/out-of-band-cache)
[![npm Downloads](https://img.shields.io/npm/dm/out-of-band-cache.svg?style=flat-square)](https://npmcharts.com/compare/out-of-band-cache?minimal=true)
[![Build Status](https://travis-ci.com/godaddy/out-of-band-cache.svg?branch=master)](https://travis-ci.com/godaddy/out-of-band-cache)
[![Dependencies](https://img.shields.io/david/godaddy/out-of-band-cache.svg?style=flat-square)](https://david-dm.org/godaddy/out-of-band-cache)

A generic cache/refreshing module for api clients. `out-of-band-cache` can be
useful in caching your network requests, which can allow you avoid making
needlessly repeated network requests to the same endpoint. You can also avoid
hitting rate limits by limiting your requests to those which are unique.

## Installation

```sh
npm install --save out-of-band-cache
```

# Usage

You can instantiate the cache with 3 configurable options: `maxAge`,
`maxStaleness`, and `fsCachePath`.

- `maxAge`: The duration, in milliseconds, before a cached item expires
- `maxStaleness`: (Optional) The duration, in milliseconds, in which expired cache
items are still served. Defaults to 0, meaning never serve data past expiration. Can also be set to `Infinity`, meaning always give at least a cached version.
- `fsCachePath`: (Optional) file path to create a file-system based cache
- `shouldCache`: (Optional) a function to determine whether or not you will
cache a found item

## Instantiation

```js
const Cache = require('out-of-band-cache');

const cache = new Cache({
  maxAge: 10 * 60 * 1000, // cache items for 10 minutes
  maxStaleness: 60 * 60 * 1000 // Still serve expired cache items for 1 hour
});
```

If want to use a file system cache, simply pass the desired pathname as `fsCachePath`.
Here we create a file system cache in the current directory with the name `.cache`:

```js
const Cache = require('out-of-band-cache');
const path = require('path');

const cache = new Cache({
  maxAge: 10 * 60 * 1000,
  maxStaleness: 60 * 60 * 1000,
  fsCachePath: path.join(__dirname, '.cache')
});
```

## Getting Data

This is driven through `cache.get` and takes 3 parameters:

- `key`: The cache key
- `opts`: Options for this particular read. You can override `maxAge` or
potentially skip the cache entirely
- `getter`: an `async` function that defines how to fetch the data for
the given `key`.
  - The data returned is assumed to be valid when passed to `JSON.stringify`.

The results will be returned to you wrapped in an object with 2 properties:

- `value`: The result for the given `key` (i.e. the value that was cached
or retrieved from your `getter`)
- `fromCache`: A boolean that indicates whether the value was retrieved from
the cache or `false` if the `getter` was used. This can be useful when
debugging to know where the values you are using came from.

Very basic usage can be as follows:

```js
async function getter(key) {
  return 'Here is your ' + key;
}

await cache.get('data', {}, getter); // { value: 'Here is your data', fromCache: false }
await cache.get('data', {}, getter); // { value: 'Here is your data', fromCache: true }
```

In this example, `getter` is the definition on what it means to get *fresh*
data the first time. `out-of-band-cache` will store this result, either in
memory on disk, so that future `get` calls with the same key, in this case
`data`, will be immediately returned, rather then performing a potentially
expensive or time-consuming operation. This is how you can avoid needlessly
hitting the same API url via network request over and over.

If you get something that you would want to keep around for a while you can
pass a different `maxAge`:

```js
await cache.get('data', { maxAge: 120 * 60 * 1000 }, getter);
```

## Ignoring the cache

In some cases, you may want to modify how your `cache` remembers data.
You can do this in two ways. The first is to skip the cache entirely, going
directly to `getter` for your data. This can be done via the `skipCache` option.
It is important to note that this condition is evaluated **before** the `getter`.

```js
await cache.get('data', { skipCache: true }, getter);
```

The other method is conditionally choose not to remember certain items based on
their value. This can be done via the `shouldCache` option. For example: here we
are only remembering values that `=== 'data'`. It is important to note that this
condition is evaluated **after** the `getter`.

```js
await cache.get('data', { shouldCache: value => value === 'data' }, getter);
```

## Complex Getters

The `getter` function that you pass to `get` is used to retrieve fresh data
for the cache. When it is invoked, it will be sent both the `key` that needs
to be refreshed, but also the previous value of that key in the cache. This
can be useful when you know that values for particular keys never change and
are expensive to calculate.

```js
async function reusingGetter(key, previousValue) {
  // If the key never changes and we already have a value, return it.
  if (key === 'this-thing' && previousValue) return previousValue;

  // Do some expensive operation

  return `${key} is expensive to calculate`;
}

await cache.get('this-thing', {}, reusingGetter);
// -> { value: 'this-thing is expensive to calculate', fromCache: false }

await cache.get('this-thing', { maxAge: -1, maxStaleness: -1 }, reusingGetter);
// -> { value: 'this-thing is expensive to calculate', fromCache: false }
```

## Refreshing the Cache

If you want to wipe out the existing cache, you can simply use `cache.reset`.
This will remove all items from all of the caches associated with your
`client`, so *both* the in-memory and file-system caches will be wiped.

```js
// fetch fresh data
await cache.get('data', {}, getter);

// get it again, returning the cached value
await cache.get('data', {}, getter);

// clear the cache, forgetting what "data" is
await cache.reset();

// Will get fresh data again
await cache.get('data', {}, getter);
```

## Usage in an API client

The [example provided](example/client.js) outlines a barebones API client that
takes advantage of `out-of-band-cache`. You can run the example by cloning
this repo and running `npm run example`. The script should take about 4
seconds to run:

```sh
$ npm run example
Fetched {"value":{"code":123465,"planet":"Druidia"},"fromCache":false} in 2005ms
Fetched {"value":{"code":123465,"planet":"Druidia"},"fromCache":true} in 0ms
Fetched {"value":{"code":123465,"planet":"Druidia"},"fromCache":true} in 0ms
Fetched {"value":{"code":123465,"planet":"Druidia"},"fromCache":true} in 0ms
Fetched {"value":{"code":123465,"planet":"Druidia"},"fromCache":false} in 2001ms
```

## Writing your own cache

Let's say you want to add functionality to persist your cache in places other
than just in memory and on disk. You can provide the `fallback` option to
provide additional persistence methods to your cache.

```js
const Cache = require('out-of-band-cache');
const OtherCache = require('./path/to/my/my-custom-cache');

const fallback = [ new OtherCache(optionsToContructIt) ];

const cache = new Cache({
  maxAge: 10 * 60 * 1000,
  maxStaleness: 60 * 60 * 1000,
  fallback
});
```

Your new `OtherCache` will then be used *after* the built-in caches. In the
above case a fallback for the `memory` cache: any key not found in the `memory`
cache will then be looked up in `OtherCache`.

If you instead want to entirely replace the built-in array caches, you provide
a `caches` array to override it. In this example, we replicate the default
implementation by overriding with a `Memory` and `File` cache

```js
const path = require('path');
const { Memory, File } = require('out-of-band-cache');

const caches = [
  new Memory(),
  new File({
    path: path.join(__dirname, '.cache')
  })
];

const cache = new Cache({
  maxAge: 10 * 60 * 1000,
  maxStaleness: 60 * 60 * 1000,
  caches
});
```

Your new cache must, at a minimum match the following spec to integrate
properly with `out-of-band-cache`:

```js
class MyCustomCache {
  /**
   * Initializes the cache. This may need to set up connections, create files, or
   * something else that is needed before any other operations occur.
   *
   * @returns {Promise<void>} a Promise which resolves when initialization has completed.
   */
  async init() { }

  /**
   * Tries to retrieve a cache item from the existing cache
   *
   * @param {String} key - The cache key
   * @returns {Promise<JSONSerializable>} a Promise which resolves if an item was found
   * @throws {Error} an error that is thrown is the item cannot be found
   */
  async get(key) { }

  /**
   * Stores a cache item
   *
   * @param {String} key - The cache key
   * @param {JSONSerializable} value  - The JSON-serializable value to store
   * @returns {Promise<void>} a Promise which resolves once storage completes,
   * or fails if there is an error writing the value into the cache.
   */
  async set(key, value) { }

  /**
   * Clears the cache entirely
   *
   * @returns {Promise<void>} a Promise which resolves once all cache files are
   * deleted or fails if there was an error.
   */
  async reset() { }
}
```

If you want to ensure that your cache works properly, we have included a test
suite that you can run directly on your cache. **NB**, you will need to have
`mocha` and `assume` already installed to use this test.

```js
const cacheTest = require('out-of-band-cache/test/cache');
const otherCache = require('./path/to/my/my-custom-cache');

describe('MyCustomCache', function () {
  it('is correctly consumed by out-of-band-cache', function () {
    const options = {
      beforeEach: function () {
        // any setup that needs to be done before a test
      },
      afterEach: function () {
        // any teardown that needs to be done after a test
      },
      constructor: otherCache,
      builder: {
        // any options that are needed to construct an otherCache via
        // new contructor(builder)
      }
    }

    // run the mocha suite
    cacheTest(options)();
  });
})
```
