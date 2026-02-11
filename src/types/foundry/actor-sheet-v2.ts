// We use our own types instead of fvtt-types because their generic mixin types
// cause TS2589: "Type instantiation is excessively deep and possibly infinite"
// when extending HandlebarsApplicationMixin(ActorSheetV2).
// This happens because ActorSheetV2 has deep inheritance (ActorSheetV2 → DocumentSheetV2 → ApplicationV2)
// and fvtt-types' Mixin utility type tries to resolve all generic parameters through this chain.
// Note: HandlebarsApplicationMixin(ApplicationV2) works fine - it's specifically the ActorSheetV2 depth.

import { Application } from './application.js'

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

/* ---------------------------------------- */

export interface ActorSheetV2Configuration {
  id?: string
  classes?: string[]
  tag?: string
  position?: {
    width?: number
    height?: number
    top?: number
    left?: number
  }
  window?: {
    title?: string
    icon?: string
    resizable?: boolean
  }
  form?: {
    handler?: (event: SubmitEvent, form: HTMLFormElement, formData: FormDataExtended) => Promise<void>
    submitOnChange?: boolean
    closeOnSubmit?: boolean
  }
  actions?: Record<string, ActorSheetV2ActionHandler>
  document?: Actor
}

/* ---------------------------------------- */

export type ActorSheetV2ActionHandler = (event: PointerEvent, target: HTMLElement) => void | Promise<void>

/* ---------------------------------------- */

export interface ActorSheetV2RenderOptions {
  force?: boolean
  parts?: string[]
  isFirstRender?: boolean
}

/* ---------------------------------------- */

export interface ActorSheetV2RenderContext {
  actor?: Actor
  source?: unknown
  fields?: unknown
  editable?: boolean
  tabs?: Record<string, Application.Tab>
}

/* ---------------------------------------- */

export interface HandlebarsTemplatePart {
  template: string
  id?: string
  root?: boolean
  classes?: string[]
  templates?: string[]
  scrollable?: string[]
}

/* ---------------------------------------- */

export interface HeaderControlsEntry {
  icon: string
  label: string
  action: string
  visible?: boolean
}

/* ---------------------------------------- */

export interface HandlebarsActorSheetV2Constructor<TDocument extends Actor = Actor> {
  new (
    options?: DeepPartial<ActorSheetV2Configuration> & { document?: TDocument }
  ): HandlebarsActorSheetV2Instance<TDocument>
  DEFAULT_OPTIONS: DeepPartial<ActorSheetV2Configuration>
  PARTS: Record<string, HandlebarsTemplatePart>
  TABS: Record<string, Application.TabsConfiguration>
}

/* ---------------------------------------- */

export declare abstract class HandlebarsActorSheetV2Instance<TDocument extends Actor = Actor> {
  readonly actor: TDocument
  readonly document: TDocument
  readonly element: HTMLElement
  readonly options: ActorSheetV2Configuration

  static DEFAULT_OPTIONS: DeepPartial<ActorSheetV2Configuration>
  static PARTS: Record<string, HandlebarsTemplatePart>
  static TABS: Record<string, Application.TabsConfiguration>

  render(options?: Partial<ActorSheetV2RenderOptions>): Promise<this>
  close(options?: { animate?: boolean }): Promise<this>
  protected _prepareContext(options: ActorSheetV2RenderOptions): Promise<ActorSheetV2RenderContext>
  protected _preparePartContext(
    partId: string,
    context: ActorSheetV2RenderContext,
    options: DeepPartial<ActorSheetV2RenderOptions>
  ): Promise<ActorSheetV2RenderContext>
  protected _onRender(context: ActorSheetV2RenderContext, options: ActorSheetV2RenderOptions): Promise<void>
  protected _prepareTabs(group: string): Record<string, Application.Tab>
  _getHeaderControls(): HeaderControlsEntry[]
  get title(): string
}
