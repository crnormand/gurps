interface ResolverCacheKey {
  id: string
  text: string
}

/* ---------------------------------------- */

interface SelfProvider {
  id: string
  provider: any
}

/* ---------------------------------------- */

type ScriptEnvironment = Record<string, unknown>

/* ---------------------------------------- */

const MODULE_NAME = 'scriptResolver'

/* ---------------------------------------- */

const GLOBAL_RESOLVER_CACHE = `${MODULE_NAME}.global-resolver-cache`

export { GLOBAL_RESOLVER_CACHE }
export type { ResolverCacheKey, SelfProvider, ScriptEnvironment }
