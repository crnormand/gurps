// We use our own types instead of fvtt-types because their generic mixin types
// cause TS2589: "Type instantiation is excessively deep and possibly infinite"
// when extending HandlebarsApplicationMixin(ItemSheetV2).
// See actor-sheet.ts for more context on this pattern.

import { DeepPartial } from 'fvtt-types/utils'

import { Application, HeaderControlsEntry } from './application.js'
import { DocumentSheet } from './document-sheet.js'
import { HandlebarsApplicationMixin } from './handlebars.js'

/* ---------------------------------------- */

export namespace ItemSheet {
  export type ActionHandler = DocumentSheet.ActionHandler

  /* ---------------------------------------- */

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Configuration<Type extends Item.SubType = Item.SubType> extends DocumentSheet.Configuration<
    Item.OfType<Type>
  > {}

  /* ---------------------------------------- */

  export type DefaultOptions<Conf extends Configuration = Configuration> = DocumentSheet.DefaultOptions<Conf>

  /* ---------------------------------------- */

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface RenderOptions extends DocumentSheet.RenderOptions {}

  /* ---------------------------------------- */

  export interface RenderContext extends DocumentSheet.RenderContext {
    item?: Item.Implementation
  }

  /* ---------------------------------------- */

  export interface HandlebarsConstructor<
    TDocument extends Item = Item,
    TRenderContext extends ItemSheet.RenderContext = ItemSheet.RenderContext,
    TConfiguration extends ItemSheet.Configuration = ItemSheet.Configuration,
    TRenderOptions extends ItemSheet.RenderOptions = ItemSheet.RenderOptions,
  > {
    new (
      options?: TConfiguration & { document?: TDocument }
    ): ItemSheet.HandlebarsInstance<TDocument, TConfiguration, TRenderOptions, TRenderContext>
    DEFAULT_OPTIONS: ItemSheet.DefaultOptions
    PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart>
    TABS: Record<string, Application.TabsConfiguration>
  }

  /* ---------------------------------------- */

  export declare abstract class HandlebarsInstance<
    TDocument extends Item = Item,
    TConfiguration extends ItemSheet.Configuration = ItemSheet.Configuration,
    TRenderOptions extends ItemSheet.RenderOptions = ItemSheet.RenderOptions,
    TRenderContext extends ItemSheet.RenderContext = ItemSheet.RenderContext,
  > {
    readonly item: TDocument
    readonly document: TDocument
    readonly element: HTMLElement
    readonly options: TConfiguration

    static DEFAULT_OPTIONS: ItemSheet.DefaultOptions
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
