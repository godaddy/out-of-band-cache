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

You can instantiate the cache with 3 configurable options: `maxAge`, `maxStaleness`, and `fsCachePath`.

- `maxAge`: The duration, in milliseconds, before a cached item expires
- `maxStaleness`: The duration, in milliseconds, in which expired cache items are still served
- `fsCachePath`: (Optional) file path to create a file-system based cache

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
- `opts`: Options for this particular read. You can override `maxAge` or potentially skip the cache entirely
- `getter`: an `async` function that defines how to fetch the data for the given `key`.
  - The data returned is assumed to be valid when passed to `JSON.stringify`.

Very basic usage can be as follows:

```js
async function getter(key) {
  return 'Here is your ' + key;
}

await cache.get('data', {}, getter); // 'Here is your data'
```

In this example, `getter` is the definition on what it means to get *fresh*
data the first time. `out-of-band-cache` will store this result, either in
memory on disk, so that future `get` calls with the same key, in this case
`data`, will be immediately returned, rather then performing a potentially
expensive or time-consuming operation. This is how you can avoid needlessly
hitting the same API url via network request over and over.

If you get something that you would want to keep around for a while you can pass a different `maxAge`:

```js
await cache.get('data', { maxAge: 120 * 60 * 1000 }, getter);
```

Or you could elect to skip the cache entirely, going directly to `getter` for your data:

```js
await cache.get('data', { skipCache: true }, getter);
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
