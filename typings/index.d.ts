declare module 'out-of-band-cache' {
  type MaybeAsync<T> = T | Promise<T>;

  type BaseSerializable = null | string | number | boolean;

  type JSONSerializable =
    | BaseSerializable
    | { [key: string]: BaseSerializable }
    | Array<BaseSerializable>;

  interface GetResult {
    value: JSONSerializable;
    fromCache: boolean;
  }

  interface SharedCacheProps {
    maxAge?: number;
    maxStaleness?: number;
    shouldCache?: (resultObj: GetResult) => boolean;
  }

  type UpdateFn = (
    key: string,
    staleValue: JSONSerializable
  ) => Promise<JSONSerializable>;

  interface CacheType {
    init: () => MaybeAsync<void>;
    get: (key: string) => MaybeAsync<JSONSerializable>;
    set: (key: string, value: JSONSerializable) => MaybeAsync<void>;
    reset: () => MaybeAsync<void>;
  }

  interface MultiLevelCacheProps extends SharedCacheProps {
    caches: CacheType[];
  }

  interface MultiLevelCacheGetOpts extends SharedCacheProps {
    skipCache?: boolean;
  }

  class MultiLevelCache {
    constructor(opts: MultiLevelCacheProps);

    get(
      key: string,
      opts: MultiLevelCacheGetOpts,
      updateFn: UpdateFn
    ): Promise<{ value: boolean; fromCache: boolean }>;

    reset(): Promise<void>;
  }

  interface CacheOptions extends SharedCacheProps {
    fsCachePath?: string;
  }

  type CacheFunction = new (opts: CacheOptions) => MultiLevelCache;

  const Cache: CacheFunction;

  export = Cache;
}
