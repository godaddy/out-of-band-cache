# Change Log

### 1.3.0

- Add an `LRU` cache implementation
- Add a `maxMemoryItems` option to use an LRU instead of the simple in-memory cache

### 1.2.3

- [#24] Fix Typescript typings
  - Allow generics for strongly-typed cache operations
  - Fix get method so it can return non-boolean values
  
### 1.2.2

- Move `rimraf` to regular dependencies

### 1.2.1

- Perform `npm outdated` to keep all dependencies up to date

### 1.2.0

- Allow consumers to use drivers for their own caches.

### 1.1.1

- [#5] Allow for call-level age overrides as specified in the README.
- [#4] Bump various dev-dependencies

### 1.1.0

- [#2] Conditionally ignore cache

### 1.0.1

- [#1] Several small improvements.

### 1.0.0

- Initial Implementation

[#1]: https://github.com/godaddy/out-of-band-cache/pull/1
[#2]: https://github.com/godaddy/out-of-band-cache/pull/2
[#4]: https://github.com/godaddy/out-of-band-cache/pull/4
[#5]: https://github.com/godaddy/out-of-band-cache/pull/5
[#24]: https://github.com/godaddy/out-of-band-cache/pull/24
