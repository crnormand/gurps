/**
 * Custom Foundry VTT type declarations.
 *
 * These re-export types from fvtt-types as proper namespaces to support
 * generic constraints like `Schema extends fields.DataSchema`.
 *
 * Usage:
 * ```typescript
 * import type { fields, DataModel, Document } from '../types/foundry/index.js'
 *
 * // For runtime field creation, use the global:
 * const fieldsRuntime = foundry.data.fields
 * const myField = new fieldsRuntime.StringField({ required: true })
 *
 * // For type annotations, use imported types:
 * class MyModel<Schema extends fields.DataSchema> { ... }
 * ```
 */

export { Application } from './application.ts'
export { fields } from './data-fields.ts'
export { DataModel } from './data-model.ts'
export { Document } from './document.ts'

// Re-export existing custom types
export type {
  ActorSheetV2ActionHandler,
  ActorSheetV2Configuration,
  ActorSheetV2RenderContext,
  ActorSheetV2RenderOptions,
  DeepPartial,
  HandlebarsActorSheetV2Constructor,
  HandlebarsActorSheetV2Instance,
  HandlebarsTemplatePart,
  HeaderControlsEntry,
} from './actor-sheet-v2.ts'
