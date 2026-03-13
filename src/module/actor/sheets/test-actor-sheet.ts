import { DeepPartial, DocumentSheetV2, HandlebarsApplicationMixin, ActorSheet } from '@gurps-types/foundry/index.js'

class TestActorSheet extends HandlebarsApplicationMixin(ActorSheet) {
  static override DEFAULT_OPTIONS: DocumentSheetV2.DefaultOptions = {
    tag: 'form',
    position: { width: 600, height: 400 },
    window: { resizable: true },
    form: { submitOnChange: true },
  }

  /* ---------------------------------------- */
  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    sheet: {
      template: 'systems/gurps/templates/actor/test-sheet.hbs',
    },
  }

  /* ---------------------------------------- */

  // @ts-expect-error: Improper typing
  protected override async _prepareContext(
    options: DeepPartial<ActorSheet.RenderOptions> & { isFirstRender: boolean }
  ): Promise<ActorSheet.RenderContext> {
    // @ts-expect-error: Improper typing
    const context = await super._prepareContext(options)

    Object.assign(context, {
      system: this.actor.system,
      systemSource: this.actor._source.system,
      systemFields: this.actor.system.schema.fields,
    })

    console.log('context', context)

    return context
  }
}

/* ---------------------------------------- */

export { TestActorSheet }
