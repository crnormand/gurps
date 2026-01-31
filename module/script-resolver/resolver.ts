import { ScriptAttribute } from './data/attribute.ts'
import { ScriptCharacter } from './data/character.ts'
import { executeScript } from './execute-script.ts'
import { GLOBAL_RESOLVER_CACHE, ResolverCacheKey, ScriptContext, SelfProvider } from './types.ts'

/* ---------------------------------------- */

class Resolver {
  static maximumAllowedResolutionDepth = 20

  static maximumScriptExecutionTimeMs = 1000

  static resolveToNumber(actor: Actor.Implementation | null, selfProvider: SelfProvider, text: string): number {
    text = text.trim()

    if (text === '') return 0

    let value = Number(text)

    if (!isNaN(value)) return value

    const result = this.resolveScript(actor, selfProvider, text)

    value = Number(result)

    if (isNaN(value)) {
      console.error(`Resolver: Unable to resolve text to number: ${text}`)

      return 0
    }

    return value
  }

  /* ---------------------------------------- */

  static async resolveScript(
    actor: Actor.Implementation | null,
    selfProvider: SelfProvider,
    text: string,
    resolutionDepth = 0
  ): Promise<string> {
    resolutionDepth += 1

    try {
      if (resolutionDepth > Resolver.maximumAllowedResolutionDepth) {
        console.error('Maximum resolution depth reached!')

        return ''
      }

      // NOTE: Temporary. The full implementation would use a global resolve cache.
      let resolverCache: Map<ResolverCacheKey, string> = this.globalResolverCache

      if (actor && actor.isOfType('gcsCharacter')) {
        resolverCache = actor.system.resolverCache
      }

      const key: ResolverCacheKey = { id: selfProvider.id, text: text }

      if (resolverCache.has(key)) {
        return resolverCache.get(key)!
      }

      const maxTime = this.maximumScriptExecutionTimeMs

      // const args: Record<string, unknown> = {}
      const context: ScriptContext = {}

      if (selfProvider.provider) {
        context.self = selfProvider.provider
      }

      if (actor && actor.isOfType('gcsCharacter')) {
        context.entity = { ...new ScriptCharacter(actor.system) }

        const list = actor.system._attributes

        for (const attribute of list) {
          const def = attribute.definition

          if (!def || def.isSeparator) continue

          context[`$${attribute.id}`] = { ...new ScriptAttribute(attribute) }
        }
      }

      const result = await executeScript(text, context, maxTime)

      if (result.success === false) {
        console.error('Script execution failed. Reason:', result.reason)

        return result.value
      }

      resolverCache.set(key, result.value)

      return result.value
    } catch (error) {
      console.error(`Script execution failed: ${text}`, error)

      return ''
    } finally {
      resolutionDepth -= 1
    }
  }

  /* ---------------------------------------- */

  static get globalResolverCache(): Map<ResolverCacheKey, string> {
    if (!game.settings) return new Map()

    return game.settings.get(GURPS.SYSTEM_NAME, GLOBAL_RESOLVER_CACHE)
  }
}

export { Resolver }
