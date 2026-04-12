// We use our own types instead of fvtt-types because their generic mixin types
// cause TS2589: "Type instantiation is excessively deep and possibly infinite"
// when extending HandlebarsApplicationMixin(ActorSheetV2).
// This happens because ActorSheetV2 has deep inheritance (ActorSheetV2 → DocumentSheetV2 → ApplicationV2)
// and fvtt-types' Mixin utility type tries to resolve all generic parameters through this chain.
// Note: HandlebarsApplicationMixin(ApplicationV2) works fine - it's specifically the ActorSheetV2 depth.

import { DeepPartial } from 'fvtt-types/utils'

import { Application, HeaderControlsEntry } from './application.js'
import { DocumentSheet } from './document-sheet.js'
import { HandlebarsApplicationMixin } from './handlebars.js'

/* ---------------------------------------- */

export namespace ActorSheet {
  export type ActionHandler = DocumentSheet.ActionHandler

  /* ---------------------------------------- */

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Configuration<Type extends Actor.SubType = Actor.SubType>
    extends DocumentSheet.Configuration<Actor.OfType<Type>> {}

  /* ---------------------------------------- */

  export type DefaultOptions<Conf extends Configuration = Configuration> = DocumentSheet.DefaultOptions<Conf>

  /* ---------------------------------------- */

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface RenderOptions extends DocumentSheet.RenderOptions {}

  /* ---------------------------------------- */

  export interface RenderContext extends DocumentSheet.RenderContext {
    actor?: Actor.Implementation
  }

  /* ---------------------------------------- */

  export interface HandlebarsConstructor<
    TDocument extends Actor = Actor,
    TRenderContext extends ActorSheet.RenderContext = ActorSheet.RenderContext,
    TConfiguration extends ActorSheet.Configuration = ActorSheet.Configuration,
    TRenderOptions extends ActorSheet.RenderOptions = ActorSheet.RenderOptions,
  > {
    new (
      options?: TConfiguration & { document?: TDocument }
    ): ActorSheet.HandlebarsInstance<TDocument, TConfiguration, TRenderOptions, TRenderContext>
    DEFAULT_OPTIONS: ActorSheet.DefaultOptions
    PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart>
    TABS: Record<string, Application.TabsConfiguration>
  }

  /* ---------------------------------------- */

  export declare abstract class HandlebarsInstance<
    TDocument extends Actor = Actor,
    TConfiguration extends ActorSheet.Configuration = ActorSheet.Configuration,
    TRenderOptions extends ActorSheet.RenderOptions = ActorSheet.RenderOptions,
    TRenderContext extends ActorSheet.RenderContext = ActorSheet.RenderContext,
  > {
    readonly actor: TDocument
    readonly document: TDocument
    readonly element: HTMLElement
    readonly options: TConfiguration

    static DEFAULT_OPTIONS: ActorSheet.DefaultOptions
    static PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart>
    static TABS: Record<string, Application.TabsConfiguration>

    render(options?: Partial<TRenderOptions>): Promise<this>
    close(options?: { animate?: boolean }): Promise<this>
    protected _prepareContext(options: TRenderOptions): Promise<TRenderContext>
    protected _preparePartContext(
      partId: string,
      context: TRenderContext,
      options: DeepPartial<TRenderOptions>
    ): Promise<TRenderContext>
    protected _configureRenderOptions(options: DeepPartial<TRenderOptions>): void
    protected _onRender(context: TRenderContext, options: TRenderOptions): Promise<void>
    protected _onFirstRender(context: TRenderContext, options: TRenderOptions): Promise<void>
    protected _prepareTabs(group: string): Record<string, Application.Tab>
    protected _renderFrame(options: DeepPartial<TRenderOptions>): Promise<HTMLElement>
    protected _createContextMenu(
      handler: Application.CreateContextMenuHandler,
      selector: string,
      options: Application.CreateContextMenuOptions
    ): ContextMenu | null
    protected _getHeaderControls(): HeaderControlsEntry[]
    protected _canDragStart(selector: string): boolean
    protected _canDragDrop(selector: string): boolean
    protected _onDragStart(event: DragEvent): void
    protected _onDragOver(event: DragEvent): void
    protected _onDrop(event: DragEvent): Promise<void>
    get title(): string
    get window(): Application.Window
    get isEditable(): boolean
  }
}
