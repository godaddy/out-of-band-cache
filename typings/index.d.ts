declare module 'out-of-band-cache' {
  type MaybeAsync<T> = T | Promise<T>;

  type BaseSerializable = null | string | number | boolean;

  type JSONSerializable =
    | BaseSerializable
    | { [key: string]: BaseSerializable }
    | Array<BaseSerializable>;

  interface GetResult<Value extends JSONSerializable> {
    value: Value;
    fromCache: boolean;
  }

  interface SharedCacheProps<Value extends JSONSerializable> {
    maxAge?: number;
    maxStaleness?: number;
    shouldCache?: (value: Value) => boolean;
  }

  type UpdateFn<Value extends JSONSerializable> = (
    key: string,
    staleValue: Value
  ) => Promise<Value>;

  interface CacheType {
    init: () => MaybeAsync<void>;
    get<Value extends JSONSerializable>(key: string): MaybeAsync<Value>;
    set<Value extends JSONSerializable>(key: string, value: Value): MaybeAsync<void>;
    reset: () => MaybeAsync<void>;
  }

  interface MultiLevelCacheProps extends SharedCacheProps<any> {
    caches: CacheType[];
  }

  interface MultiLevelCacheGetOpts<Value extends JSONSerializable> extends SharedCacheProps<Value> {
    skipCache?: boolean;
  }

  class MultiLevelCache {
    constructor(opts: MultiLevelCacheProps);

    get<Value extends JSONSerializable>(
      key: string,
      opts: MultiLevelCacheGetOpts<Value>,
      updateFn: UpdateFn<Value>
    ): Promise<GetResult<Value>>;

    reset(): Promise<void>;
  }

  interface CacheOptions extends SharedCacheProps<any> {
    fsCachePath?: string;
  }

  type CacheFunction = new (opts: CacheOptions) => MultiLevelCache;

  const Cache: CacheFunction;

  export = Cache;
}
