// self.onmessage = async function (event) {
//   const { code, context, timeout = 1000, executionId } = event.data
//
//   try {
//     // Create exeuction timeout
//     const timeoutId = setTimeout(() => {
//       self.postMessage({
//         success: false,
//         error: 'Script execution timed out',
//         executionId,
//       })
//       self.close()
//     }, timeout)
//
//     // Parse and validate the context
//     const safeContext: AnyMutableObject = {}
//
//     for (const [key, value] of Object.entries(context)) {
//       // Only allow specific types in the context
//       if (
//         typeof value === 'number' ||
//         typeof value === 'string' ||
//         typeof value === 'boolean' ||
//         value === null ||
//         typeof value === 'object'
//       ) {
//         safeContext[key] = value
//       }
//     }
//
//     self.postMessage({ type: 'log', args: ['Context sanitized', safeContext], executionId })
//
//     // Create the execution function with only the provided context
//     const contextKeys = Object.keys(safeContext)
//     const contextValues = Object.values(safeContext)
//
//     // This function should:
//     // - have no access to the DOM
//     // - have no access to global variables
//     const fn = new Function(...contextKeys, `return (function() { "use strict"; ${code} })();`)
//
//     // Execute the function with the context values
//     const result = fn(...contextValues)
//
//     // Clear the timeout if execution completes in time
//     clearTimeout(timeoutId)
//
//     // Send back the result
//     self.postMessage({ success: true, result, executionId })
//   } catch (error: any) {
//     self.postMessage({ success: false, error: error.message, executionId })
//   }
// }

self.onmessage = async function (event) {
  const { code, context, timeout = 1000, executionId } = event.data

  try {
    const timeoutId = setTimeout(() => {
      self.postMessage({ success: false, error: 'Script execution timed out', executionId })
      self.close()
    }, timeout)

    const safeContext: Record<string, any> = {}

    for (const [k, v] of Object.entries(context ?? {})) safeContext[k] = v

    const contextKeys = Object.keys(safeContext)
    const contextValues = Object.values(safeContext)

    // Optional hardening: shadow common globals
    const blockedKeys = [
      'foundry',
      'game',
      'ui',
      'canvas',
      'window',
      'document',
      'globalThis',
      'self',
      'Function',
      'eval',
    ]
    const blockedValues = blockedKeys.map(() => undefined)

    // Treat input as an expression and return its value
    const fn = new Function(...contextKeys, ...blockedKeys, `"use strict"; return (${code});`)

    const result = fn(...contextValues, ...blockedValues)

    clearTimeout(timeoutId)
    self.postMessage({ success: true, result, executionId })
  } catch (error: any) {
    self.postMessage({ success: false, error: error?.message ?? String(error), executionId })
  }
}

/* ---------------------------------------- */

// Handling for uncaught errors
self.onerror = function (error: any) {
  self.postMessage({ success: false, error: `Worker error: ${error.message}`, executionId: null })
}

/* ---------------------------------------- */

self.postMessage({ type: 'log', args: ['Sandbox worker initialized'], executionId: null })
