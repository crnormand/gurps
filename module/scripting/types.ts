interface ResolverCacheKey {
  id: string
  text: string
}

/* ---------------------------------------- */

interface SelfProvider<T = Record<string, unknown>> {
  id: string
  provider: T
}

/* ---------------------------------------- */

type NodeLocContext = {
  start: number
  end: number
  loc?: { start?: { line: number; column: number } } | null
}

/* ---------------------------------------- */

type ThrownDetails = {
  name?: unknown
  message?: unknown
  pos?: unknown
  raisedAt?: unknown
  loc?: unknown
  __nodeLoc?: unknown
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

const MODULE_NAME = 'scripting'

/* ---------------------------------------- */

const GLOBAL_RESOLVER_CACHE = `${MODULE_NAME}.globalResolverCache`

/* ---------------------------------------- */
/*  Type Guards                             */
/* ---------------------------------------- */

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

/* ---------------------------------------- */

function asThrownDetails(v: unknown): ThrownDetails | undefined {
  return isRecord(v) ? (v as ThrownDetails) : undefined
}

/* ---------------------------------------- */

function asNodeLocContext(v: unknown): NodeLocContext | undefined {
  if (!isRecord(v)) return undefined
  const start = (v as any).start
  const end = (v as any).end

  if (typeof start !== 'number' || typeof end !== 'number') return undefined

  return v as NodeLocContext
}

export { GLOBAL_RESOLVER_CACHE, isRecord, asThrownDetails, asNodeLocContext }
export type {
  ResolverCacheKey,
  ScriptEnvironment,
  ScriptErrResult,
  ScriptOkResult,
  ScriptResult,
  SelfProvider,
  NodeLocContext,
  ThrownDetails,
}
