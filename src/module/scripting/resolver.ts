import { ScriptAttribute, ScriptEntity, ScriptGlobal } from './interfaces/index.ts'
import { ScriptInterpreter } from './interpreter.ts'
import { ResolverCache, ScriptEnvironment, SelfProvider, GLOBAL_RESOLVER_CACHE } from './types.ts'

class ScriptResolver {
  static MAXIMUM_ALLOWED_DEPTH = 20

  static MAXIMUM_EXECUTION_TIME_MS = 1000

  depth: number

  /* ---------------------------------------- */

  constructor() {
    this.depth = 0
  }

  get globalResolverCache(): ResolverCache {
    if (!game.settings) return new Map()

    return game.settings.get(GURPS.SYSTEM_NAME, GLOBAL_RESOLVER_CACHE)
  }

  /* ---------------------------------------- */

  static resolveToNumber(actor: Actor.Implementation | null, selfProvider: SelfProvider<any>, script: string): number {
    script = script.trim()
    if (script === '') return 0

    let value = Number(script)

    if (!isNaN(value)) return value

    const result = this.resolveScript(actor, selfProvider, script)

    value = Number(result)

    if (isNaN(value)) {
      console.error(`Unable to resolve script result to a number, result: "${result}", script: "${script}"`)

      return 0
    }

    return value
  }

  /* ---------------------------------------- */

  static resolveScript(actor: Actor.Implementation | null, selfProvider: SelfProvider, script: string): string {
    const resolver = new ScriptResolver()

    return resolver.#resolveScript(actor, selfProvider, script)
  }

  /* ---------------------------------------- */

  #resolveScript(actor: Actor.Implementation | null, selfProvider: SelfProvider, script: string): string {
    this.depth += 1

    try {
      if (this.depth > ScriptResolver.MAXIMUM_ALLOWED_DEPTH) {
        console.error('Maximum resolution depth reached!')

        return ''
      }

      let resolverCache = this.globalResolverCache

      if (actor && actor.isOfType('gcsCharacter')) {
        resolverCache = actor.system.resolverCache
      }

      const id = selfProvider.id
      let cacheEntry: Map<string, string>

      if (resolverCache.has(id)) {
        cacheEntry = resolverCache.get(id) ?? new Map()

        if (cacheEntry && cacheEntry.has(script)) {
          return cacheEntry.get(script) || ''
        }
      } else {
        cacheEntry = new Map()
      }

      // const maxTime = ScriptResolver.MAXIMUM_EXECUTION_TIME_MS

      const environment: ScriptEnvironment = { ...ScriptGlobal }

      if (selfProvider.provider) {
        environment['self'] = selfProvider.provider
      }

      if (actor && actor.isOfType('gcsCharacter')) {
        environment['entity'] = new ScriptEntity(actor.system)

        for (const attribute of Object.values(actor.system._attributes)) {
          const definition = attribute.definition

          if (!definition || definition.isSeparator) continue

          environment['$' + attribute.id] = new ScriptAttribute(attribute)
        }
      }

      const result = ScriptInterpreter.runScript(script, environment)

      if (result.ok) {
        cacheEntry.set(script, String(result.value))
        if (!resolverCache.has(id)) resolverCache.set(id, cacheEntry)

        return String(result.value)
      } else {
        console.error(`An error occurred while attempting to resolve script: ${script}`)

        return ''
      }
    } finally {
      this.depth -= 1
    }
  }
}

/* ---------------------------------------- */

export { ScriptResolver }
