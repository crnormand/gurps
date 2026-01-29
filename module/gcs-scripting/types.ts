interface BaseProvider {
  self: any
}

/* ---------------------------------------- */

interface SelfProvider<Provider extends BaseProvider = BaseProvider> {
  id: string
  // The "provider" is an arbitrary object used to resolve the script against.
  // It represents a sandboxed environment in which the script runs.
  provider: Provider
}

/* ---------------------------------------- */

interface ResolverCacheKey {
  id: string
  text: string
}

/* ---------------------------------------- */

interface ScriptArgument<T = any> {
  name: string
  value: T
}

/* ---------------------------------------- */

export type { BaseProvider, ResolverCacheKey, ScriptArgument, SelfProvider }
