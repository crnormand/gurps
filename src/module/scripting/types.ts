type ResolverCache = Map<string, Map<string, string>>

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/* ---------------------------------------- */

function asThrownDetails(value: unknown): ThrownDetails | undefined {
  return isRecord(value) ? (value as ThrownDetails) : undefined
}

/* ---------------------------------------- */

function asNodeLocContext(value: unknown): NodeLocContext | undefined {
  if (!isRecord(value)) return undefined
  const start = (value as any).start
  const end = (value as any).end

  if (typeof start !== 'number' || typeof end !== 'number') return undefined

  return value as NodeLocContext
}

export { GLOBAL_RESOLVER_CACHE, isRecord, asThrownDetails, asNodeLocContext }
export type {
  ResolverCache,
  ScriptEnvironment,
  ScriptErrResult,
  ScriptOkResult,
  ScriptResult,
  SelfProvider,
  NodeLocContext,
  ThrownDetails,
}
