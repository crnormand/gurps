// import type { AnyFunction } from 'fvtt-types/utils'

import { ScriptContext } from './types.ts'

type SandboxResult = { success: true; value: string } | { success: false; value: ''; reason: 'timeout' | 'error' }

/**
 * Evaluate `code` as an expression in a fresh AsyncWorker.
 * - Terminates the worker if `timeoutMs` elapses.
 * - On any failure/timeout: returns { success:false, value:"" }.
 * - Context values must be structured-cloneable (Foundry will clone them anyway).
 */
export async function executeScript(code: string, context: ScriptContext, timeoutMs = 500): Promise<SandboxResult> {
  // context =
  //   context instanceof Array
  //     ? context.reduce((obj: Record<string, unknown>, e) => {
  //         obj[e.name] = e.value
  //
  //         return obj
  //       }, {})
  //     : context
  //
  // const attributesById: Record<string, unknown> = Object.fromEntries(
  //   [
  //     { id: 'foo', name: 'Foo', value: 1 },
  //     { id: 'bar', name: 'Bar', value: 2 },
  //   ].map((a: any) => [a.id, a]) // or [a.id, a.value] depending on what GCS returns
  // )
  //
  // context.attributesById = attributesById
  //
  console.log(context)

  const w = await game.workers!.createWorker(`gga-executor-${foundry.utils.randomID()}`, {
    debug: false,
  })

  let timeoutHandle: number | undefined

  const errorResult = (): SandboxResult => ({
    success: false,
    value: '',
    reason: 'error',
  })

  const timeoutResult = (): SandboxResult => ({
    success: false,
    value: '',
    reason: 'timeout',
  })

  try {
    await w.loadFunction('run', (code: string, context: ScriptContext) => {
      const blockedKeys = [
        'game',
        'foundry',
        'ui',
        'canvas',
        'window',
        'document',
        'globalThis',
        'Function',
        'fetch',
        'XMLHttpRequest',
        'WebSocket',
        'EventSource',
        'importScripts',
      ] as const
      const blockedValues = blockedKeys.map(() => undefined)

      const contextKeys = Object.keys(context)

      const contextValues = Object.values(context).map(value => {
        const data = Object.assign(Object.create(null), value.data)

        for (const [name, spec] of Object.entries(value.methods)) {
          if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) continue // avoid weird property names

          const fnBody = spec.type === 'expr' ? `"use strict"; return (${spec.expr});` : `"use strict";\n${spec.body}`
          const fn = new Function(...spec.args, fnBody)

          Object.defineProperty(data, name, {
            enumerable: false,
            value: fn,
          })
        }

        return data
      })

      const fn = new Function(
        ...contextKeys,
        ...blockedKeys,
        `"use strict";
        try {
          const __v = (${code});
          return [{ success: true, value: String(__v) }, []];
        } catch (_e) {
          return [{ success: false, value: "", reason: "error" }, []];
        }
        `
      )

      return fn(...contextValues, ...blockedValues)
    })

    // const args = [...Object.values(context), ...blockedValues]
    const args = [code, context]

    const execPromise = (async () => {
      // const res = (await w.executeFunction('exprFn', args)) as SandboxResult
      const res = (await w.executeFunction('run', args)) as SandboxResult

      return res?.success ? res : errorResult()
    })()

    const timeoutPromise = new Promise<SandboxResult>(resolve => {
      timeoutHandle = window.setTimeout(() => {
        try {
          // Hard-stop runaway scripts
          w.terminate()
        } catch {
          // ignore
        }

        resolve(timeoutResult())
      }, timeoutMs)
    })

    return await Promise.race([execPromise, timeoutPromise])
  } catch (error) {
    try {
      w.terminate()
    } catch {
      // ignore
    }

    console.error(error)

    return errorResult()
  } finally {
    if (timeoutHandle !== undefined) window.clearTimeout(timeoutHandle)

    try {
      w.terminate()
    } catch {
      // ignore
    }
  }
}
