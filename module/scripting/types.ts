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

type ScriptOkResult = { ok: true; value: unknown }

/* ---------------------------------------- */

type ScriptErrResult = {
  ok: false
  error: {
    name: string
    message: string
    line?: number
    column?: number
    start?: number
    end?: number
  }
}

/* ---------------------------------------- */

type ScriptResult = ScriptOkResult | ScriptErrResult

/* ---------------------------------------- */

const MODULE_NAME = 'scriptResolver'

/* ---------------------------------------- */

const GLOBAL_RESOLVER_CACHE = `${MODULE_NAME}.global-resolver-cache`

export { GLOBAL_RESOLVER_CACHE }
export type { ResolverCacheKey, ScriptEnvironment, ScriptErrResult, ScriptOkResult, ScriptResult, SelfProvider }
