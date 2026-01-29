// import { ScriptAttribute } from './script-attribute.ts'
// import { ScriptCharacter } from './script-character.ts'
// import { BaseProvider, ResolverCacheKey, ScriptArgument, SelfProvider } from './types.ts'

/* ---------------------------------------- */

class ScriptResolver {
  // #actor: Actor.Implementation | null = null
  // #selfProvider: SelfProvider<Provider>
  // #text: string
  // #resolutionDepth = 0
  //
  // #scriptResolverCache: Map<ScriptResolverKey, string> = new Map()
  //
  // static maximumAllowedResolutionDepth = 20
  //
  // static maximumScriptExecutionTimeMs = 1000
  //
  // static resolveToNumber<Provider extends BaseProvider>(
  //   actor: Actor.Implementation | null,
  //   selfProvider: SelfProvider<Provider>,
  //   text: string
  // ): number {
  //   text = text.trim()
  //
  //   if (text === '') return 0
  //
  //   let value = Number(text)
  //
  //   if (!isNaN(value)) return value
  //
  //   const result = this.resolveScript(actor, selfProvider, text)
  //
  //   value = Number(result)
  //
  //   if (isNaN(value)) {
  //     console.error(`ScriptResolver: Unable to resolve text to number: ${text}`)
  //
  //     return 0
  //   }
  //
  //   return value
  // }
  //
  //   static _worker: foundry.helpers.AsyncWorker | null = null
  //
  //   /* ---------------------------------------- */
  //
  //   static async getSandboxWorker() {
  //     if (this._worker) return this._worker
  //
  //     // name is just an identifier
  //     const w = await game.workers!.createWorker('my-sandbox', {
  //       debug: false,
  //       // loadPrimitives: false, // optional (see docs)
  //     })
  //
  //     await w.ready // the worker harness is ready :contentReference[oaicite:1]{index=1}
  //
  //     // Load a PURE function into the worker. It cannot rely on outer scope. :contentReference[oaicite:2]{index=2}
  //     await w.loadFunction('evalExpr', (code: string, context: Record<string, unknown> = {}) => {
  //       // Context becomes "globals" by being function parameters.
  //       const keys = Object.keys(context)
  //       const values = Object.values(context)
  //
  //       // Optional: shadow common Foundry globals to reduce accidental access
  //       const blockedKeys = ['game', 'foundry', 'ui', 'canvas', 'window', 'document', 'globalThis', 'self']
  //       const blockedValues = blockedKeys.map(() => undefined)
  //
  //       // Expression-mode evaluation
  //       const fn = new Function(...keys, ...blockedKeys, `"use strict"; return (${code});`)
  //
  //       return fn(...values, ...blockedValues)
  //     })
  //
  //     this._worker = w
  //
  //     return w
  //   }
  //
  //   /* ---------------------------------------- */
  //
  //   static async testSandbox(code: string, context: Record<string, unknown>) {
  //     const w = await this.getSandboxWorker()
  //
  //     return w.executeFunction('evalExpr', [code, context])
  //   }
  //
  //   /* ---------------------------------------- */
  //
  //   static async resolveScript<Provider extends BaseProvider>(
  //     actor: Actor.Implementation | null,
  //     selfProvider: SelfProvider<Provider>,
  //     text: string,
  //     resolutionDepth = 0
  //   ): Promise<string> {
  //     resolutionDepth += 1
  //
  //     try {
  //       if (resolutionDepth > ScriptResolver.maximumAllowedResolutionDepth) {
  //         console.error('Maximum resolution depth reached!')
  //
  //         return ''
  //       }
  //
  //       // NOTE: Temporary. The full implementation would use a global resolve cache.
  //       let resolverCache: Map<ResolverCacheKey, string> = new Map()
  //
  //       if (actor && actor.isOfType('gcsCharacter')) {
  //         resolverCache = actor.system.resolverCache
  //       }
  //
  //       const key: ResolverCacheKey = { id: selfProvider.id, text: text }
  //
  //       if (resolverCache.has(key)) {
  //         return resolverCache.get(key)!
  //       }
  //
  //       const maxTime = this.maximumScriptExecutionTimeMs
  //
  //       const args: ScriptArgument[] = []
  //
  //       if (selfProvider.provider) {
  //         args.push({
  //           name: 'self',
  //           value: selfProvider.provider,
  //         })
  //       }
  //
  //       if (actor && actor.isOfType('gcsCharacter')) {
  //         args.push({
  //           name: 'entity',
  //           value: () => {
  //             return { ...new ScriptCharacter(actor.system) }
  //           },
  //         })
  //
  //         const list = actor.system._attributes
  //
  //         for (const attribute of list) {
  //           const def = attribute.definition
  //
  //           if (!def || def.isSeparator) continue
  //
  //           args.push({
  //             name: '$' + attribute.id,
  //             value: () => {
  //               return new ScriptAttribute(attribute)
  //             },
  //           })
  //         }
  //       }
  //
  //       console.log('args:', args)
  //
  //       const result = await new executeScript(text, args, maxTime)
  //
  //       console.log('result', result)
  //
  //       resolverCache.set(key, result)
  //
  //       return String(result)
  //     } catch (error) {
  //       console.error(`Script execution failed: ${text}`, error)
  //
  //       return ''
  //     } finally {
  //       resolutionDepth -= 1
  //     }
  //   }
  // constructor(
  //   actor: Actor.Implementation | null,
  //   selfProvider: SelfProvider<Provider>,
  //   text: string,
  //   resolutionDepth = 0
  // ) {
  //   this.#actor = actor
  //   this.#selfProvider = selfProvider
  //   this.#text = text
  //   this.#resolutionDepth = resolutionDepth
  // }
  /* ---------------------------------------- */
  // static resolveToNumber(actor: Actor.Implementation, selfProvider: SelfProvider, text: string): number {
  //   return new GcsScriptResolver(actor, selfProvider, text).resolveToNumber()
  // }
  //
  // resolveToNumber(): number {
  //   const text = this.#text.trim()
  //
  //   if (text === '') return 0
  //
  //   let value = Number(text)
  //
  //   if (!isNaN(value)) {
  //     return value
  //   }
  //
  //   const result = this.resolveScript()
  //
  //   value = Number(result)
  //
  //   if (isNaN(value)) {
  //     console.error(`resolveToNumber: Unable to resolve text to number: ${text}`)
  //
  //     return 0
  //   }
  //
  //   return value
  // }
  //
  // /* ---------------------------------------- */
  //
  // resolveScript(): string {
  //   this.#resolutionDepth += 1
  //
  //   try {
  //     if (this.#resolutionDepth > GcsScriptResolver.maximumAllowedResolutionDepth) {
  //       console.error('GcsScriptResolver: Maximum script resolution depth exceeded.')
  //
  //       return ''
  //     }
  //
  //     if (this.#actor && this.#actor.isOfType('gcsCharacter')) {
  //       this.#scriptResolverCache = this.#actor.system.scriptResolverCache
  //       // NOTE: If no actor is provided, currently a blank Map is used. However, a (currently unimplemented)
  //       // global cache should be used to keep in parity with GCS. The exact implementation would of course
  //       // vary from GCS' implementation.
  //     }
  //
  //     const key: ScriptResolverKey = { id: this.#selfProvider.id, text: this.#text }
  //
  //     if (this.#scriptResolverCache.has(key)) {
  //       return this.#scriptResolverCache.get(key)!
  //     }
  //
  //     let result: string
  //
  //     // NOTE: This is currently a static number but should eventually be changed to a world setting.
  //     const maxTime = GcsScriptResolver.maximumScriptExecutionTimeMs
  //     const args: ScriptArgument[] = [
  //       {
  //         name: 'entity',
  //         value: this.#selfProvider.provider,
  //       },
  //     ]
  //
  //     if (this.#actor && this.#actor.isOfType('gcsCharacter')) {
  //       const attributeList: GcsAttribute[] = this.#actor.system._attributes
  //
  //       for (const attribute of attributeList) {
  //         const definition = attribute.definition
  //
  //         if (!definition || definition.isSeparator) continue
  //
  //         args.push({
  //           name: '$' + attribute.id,
  //           value: (r: Runtime) => {
  //             return new scriptAttribute(r, attribute)
  //           },
  //         })
  //       }
  //     }
  //   } finally {
  //     this.#resolutionDepth -= 1
  //   }
  // }
}

/* ---------------------------------------- */

export { ScriptResolver }
