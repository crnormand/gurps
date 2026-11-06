import { Application } from '@gurps-types/foundry/application.js'
import { HandlebarsApplicationMixin } from '@gurps-types/foundry/handlebars.js'
import { getGame } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'
import { sheetActions } from '@module/util/sheet-actions.js'
import { DeepPartial } from 'fvtt-types/utils'

import { MoveModeV2 } from '../data/move-mode.js'

namespace MoveModeEditorV2 {
  export interface RenderContext extends Application.RenderContext {
    moveModes: MoveModeV2[]
  }

  export type Configuration = DeepPartial<Application.Configuration> & {
    actor: Actor.Implementation
  }
}

/* ---------------------------------------- */

class MoveModeEditorV2 extends HandlebarsApplicationMixin(Application)<MoveModeEditorV2.RenderContext> {
  #actor: Actor.Implementation

  constructor(public readonly configuration: MoveModeEditorV2.Configuration) {
    super(configuration)

    this.#actor = configuration.actor!
  }

  /* ---------------------------------------- */

  get document(): Actor.Implementation {
    return this.#actor
  }

  /* ---------------------------------------- */

  static override DEFAULT_OPTIONS: Application.DefaultOptions = {
    tag: 'form',
    classes: ['gcs-app'],
    position: {
      width: 600,
      height: 'auto',
    },
    window: {
      resizable: true,
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: true,
      handler: MoveModeEditorV2.#onSubmitForm,
    },
    actions: {
      createEmbedded: sheetActions.createEmbeddedDocument,
      deleteEmbedded: sheetActions.deleteEmbeddedDocument,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    table: {
      template: systemPath('templates/actor/move-mode-editor.hbs'),
    },
  }

  /* ---------------------------------------- */

  override get title() {
    return getGame().i18n.format('GURPS.moveModeEditorTitle', { name: this.#actor.name })
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: Application.RenderOptions
  ): Promise<MoveModeEditorV2.RenderContext> {
    const superContext = await super._prepareContext(options)

    return {
      ...superContext,
      moveModes: this.#actor.pseudoCollections.MoveMode.contents,
    }
  }

  /* ---------------------------------------- */

  override async _onFirstRender(
    context: DeepPartial<Application.RenderContext>,
    options: DeepPartial<Application.RenderOptions>
  ) {
    await super._onFirstRender(context, options)

    /* Automatically re-render the sheet when making changes. */
    this.document.apps[this.id] = this
  }

  /* ---------------------------------------- */

  override _onClose(options: DeepPartial<Application.RenderOptions>): void {
    super._onClose(options)

    delete this.document.apps[this.id]
  }

  /* ---------------------------------------- */

  static async #onSubmitForm(
    this: MoveModeEditorV2,
    _event: Event | SubmitEvent,
    _form: HTMLFormElement,
    formData: FormDataExtended
  ): Promise<void> {
    await this.document.update(formData.object)
  }
}

/* ---------------------------------------- */

export { MoveModeEditorV2 }
