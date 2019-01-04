const assume = require('assume');
const { it } = require('mocha');

const defaults = {
  beforeEach: () => {},
  afterEach: () => {},
  constructor: class dummy {},
  builder: {}
};

module.exports = function testInstance(options) {
  const opts = {
    ...defaults,
    ...options
  };

  const cache = new opts.constructor(opts.builder);

  return function () {
    beforeEach(opts.beforeEach);
    afterEach(opts.afterEach);

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
};
