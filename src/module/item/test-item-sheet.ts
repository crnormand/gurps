import { DeepPartial, DocumentSheetV2, HandlebarsApplicationMixin, ItemSheet } from '@gurps-types/foundry/index.js'

class TestItemSheet extends HandlebarsApplicationMixin(ItemSheet) {
  static override DEFAULT_OPTIONS: DocumentSheetV2.DefaultOptions = {
    tag: 'form',
    position: { width: 600, height: 400 },
    window: { resizable: true },
    form: { submitOnChange: true },
  }

  /* ---------------------------------------- */
  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    sheet: {
      template: 'systems/gurps/templates/item/test-sheet.hbs',
    },
  }

  /* ---------------------------------------- */

  // @ts-expect-error: Improper typing
  protected override async _prepareContext(
    options: DeepPartial<ItemSheet.RenderOptions> & { isFirstRender: boolean }
  ): Promise<ItemSheet.RenderContext> {
    // @ts-expect-error: Improper typing
    const context = await super._prepareContext(options)

    Object.assign(context, {
      system: this.item.system,
      systemSource: this.item._source.system,
      systemFields: this.item.system.schema.fields,
    })

    return context
  }
}

/* ---------------------------------------- */

export { TestItemSheet }
