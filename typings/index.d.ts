declare module 'out-of-band-cache' {
  type JSONSerializable = Object | string | number | boolean | Date;

  type GetResult = (value: JSONSerializable) => boolean;

  interface SharedCacheProps {
    maxAge?: number;
    maxStaleness?: number;
    shouldCache?: (getResultFn: GetResult) => boolean;
  }

  type UpdateFn = (
    key: string,
    staleValue: JSONSerializable
  ) => Promise<JSONSerializable>;

  interface CacheType {
    init: (...args: any) => Promise<any>;
    get: (...args: any) => Promise<any>;
    set: (...args: any) => Promise<any>;
    reset: (...args: any) => Promise<any>;
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
