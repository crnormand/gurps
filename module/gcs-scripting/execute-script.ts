import type { AnyFunction } from 'fvtt-types/utils'

type SandboxResult = { success: true; value: string } | { success: false; value: ''; reason: 'timeout' | 'error' }

/**
 * Evaluate `code` as an expression in a fresh AsyncWorker.
 * - Terminates the worker if `timeoutMs` elapses.
 * - On any failure/timeout: returns { success:false, value:"" }.
 * - Context values must be structured-cloneable (Foundry will clone them anyway).
 */
export async function executeScript(
  code: string,
  context: Record<string, unknown>,
  timeoutMs = 500
): Promise<SandboxResult> {
  const blockedKeys = [
    'game',
    'foundry',
    'ui',
    'canvas',
    'window',
    'document',
    'globalThis',
    'self',
    'Function',
    'fetch',
    'XMLHttpRequest',
    'WebSocket',
    'EventSource',
    'importScripts',
  ] as const

  const blockedValues = blockedKeys.map(() => undefined)

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
    // Build the function to run inside the worker.
    // Must return [result, transferList]
    const exprFn = new Function(
      ...Object.keys(context),
      ...blockedKeys,
      `
      "use strict";
      try {
        const __v = (${code});
        return [{ success: true, value: String(__v) }, []];
      } catch (_e) {
        return [{ success: false, value: "", reason: "error" }, []];
      }
            `
    ) as AnyFunction

    await w.loadFunction('exprFn', exprFn)

    const args = [...Object.values(context), ...blockedValues]

    const execPromise = (async () => {
      const res = (await w.executeFunction('exprFn', args)) as SandboxResult

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
