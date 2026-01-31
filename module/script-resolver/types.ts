import { AnyMutableObject } from 'fvtt-types/utils'

/* ---------------------------------------- */

interface SelfProvider {
  id: string
  // The "provider" is an arbitrary object used to resolve the script against.
  // It represents a sandboxed environment in which the script runs.
  provider: ScriptContextEntry
}

/* ---------------------------------------- */

interface ResolverCacheKey {
  id: string
  text: string
}

/* ---------------------------------------- */

enum ScriptMethodType {
  Body = 'body',
  Expr = 'expr',
}

type ScriptMethodSpec =
  | { type: ScriptMethodType.Body; args: string[]; body: string }
  | { type: ScriptMethodType.Expr; args: string[]; expr: string }

interface ScriptContextEntry {
  data: AnyMutableObject
  methods: Record<string, ScriptMethodSpec>
}

type ScriptContext = Record<string, ScriptContextEntry>

/* ---------------------------------------- */

const MODULE_NAME = 'scriptResolver'

const GLOBAL_RESOLVER_CACHE = `${MODULE_NAME}.global-resolver-cache`

/* ---------------------------------------- */

export { GLOBAL_RESOLVER_CACHE, ScriptMethodType }
export type { ScriptContext, ScriptContextEntry, ScriptMethodSpec, SelfProvider, ResolverCacheKey }
