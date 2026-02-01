import { ScriptAttribute, ScriptEntity, ScriptGlobal } from './interfaces/index.ts'
import { ScriptInterpreter } from './interpreter.ts'
import { ResolverCacheKey, ScriptEnvironment, SelfProvider, GLOBAL_RESOLVER_CACHE, ScriptResult } from './types.ts'

class ScriptResolver {
  static MAXIMUM_ALLOWED_DEPTH = 20

  static MAXIMUM_EXECUTION_TIME_MS = 1000

  depth: number

  /* ---------------------------------------- */

  constructor() {
    this.depth = 0
  }

  get globalResolverCache(): Map<ResolverCacheKey, string> {
    if (!game.settings) return new Map()

    return game.settings.get(GURPS.SYSTEM_NAME, GLOBAL_RESOLVER_CACHE)
  }

  /* ---------------------------------------- */

  static resolveScript(actor: Actor.Implementation, selfProvider: SelfProvider, script: string): ScriptResult | string {
    const resolver = new ScriptResolver()

    return resolver.#resolveScript(actor, selfProvider, script)
  }

  /* ---------------------------------------- */

  #resolveScript(actor: Actor.Implementation, selfProvider: SelfProvider, script: string): ScriptResult | string {
    this.depth += 1

    try {
      if (this.depth > ScriptResolver.MAXIMUM_ALLOWED_DEPTH) {
        console.error('Maximum resolution depth reached!')

        return ''
      }

      let resolverCache: Map<any, string> = this.globalResolverCache

      if (actor && actor.isOfType('gcsCharacter')) {
        resolverCache = actor.system.resolverCache
      }

      const key = { id: selfProvider.id, text: script }

      if (resolverCache.has(key)) {
        return resolverCache.get(key) ?? ''
      }

      // const maxTime = ScriptResolver.MAXIMUM_EXECUTION_TIME_MS

      const environment: ScriptEnvironment = { ...ScriptGlobal }

      if (selfProvider.provider) {
        environment['self'] = selfProvider.provider
      }

      if (actor && actor.isOfType('gcsCharacter')) {
        environment['entity'] = new ScriptEntity(actor.system)

        for (const attribute of actor.system._attributes) {
          const definition = attribute.definition

          if (!definition || definition.isSeparator) continue

          environment['$' + attribute.id] = new ScriptAttribute(attribute)
        }
      }

      const value = ScriptInterpreter.runScript(script, environment)

      // resolverCache.set(key, value)

      return value
    } finally {
      this.depth -= 1
    }
  }
}

/* ---------------------------------------- */

export { ScriptResolver }
