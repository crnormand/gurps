import { HandlebarsApplicationMixin, Application } from '@gurps-types/foundry/index.js'
import { createEmbeddedAction, deleteEmbeddedAction } from '@module/util/embedded-document-actions.js'
import { getGame } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'
import { DeepPartial } from 'fvtt-types/utils'

import { MoveModeV2 } from '../data/move-mode.js'
import { ActorType } from '../types.js'

type MoveModeActor = Actor.OfType<ActorType.Character>

type GurpsMoveModeEditorConfiguration = DeepPartial<Application.Configuration> & {
  actor: MoveModeActor
}

/* ---------------------------------------- */

interface GurpsMoveModeEditorRenderContext extends Application.RenderContext {
  moveModes: MoveModeV2[]
}

/* ---------------------------------------- */

class GurpsMoveModeEditor extends HandlebarsApplicationMixin(Application) {
  actor: MoveModeActor

  get document(): MoveModeActor {
    return this.actor
  }

  /* ---------------------------------------- */

  override get title(): string {
    return getGame().i18n.format('GURPS.moveModeEditorTitle', { name: this.actor.name })
  }
  /* ---------------------------------------- */

  constructor({ actor, ...options }: GurpsMoveModeEditorConfiguration) {
    super(options)

    if (!actor) {
      throw new Error('GurpsMoveModeEditor was not assigned an Actor document!')
    }

    this.actor = actor
  }

  /* ---------------------------------------- */

  static override DEFAULT_OPTIONS: Application.DefaultOptions = {
    classes: ['gurps', 'move-mode-editor'],
    tag: 'form',
    position: { width: 600, height: 300 },
    window: { resizable: true },
    form: {
      handler: GurpsMoveModeEditor.#onSubmitForm,
      closeOnSubmit: true,
      submitOnChange: false,
    },
    actions: {
      createEmbedded: GurpsMoveModeEditor.#onCreateEmbedded,
      deleteEmbedded: GurpsMoveModeEditor.#onDeleteEmbedded,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    body: {
      template: systemPath('templates/actor/move-mode-editor.hbs'),
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: Application.RenderOptions
  ): Promise<GurpsMoveModeEditorRenderContext> {
    const context = await super._prepareContext(options)

    return {
      ...context,
      moveModes: this.actor.system.moveV2?.contents ?? [],
    }
  }

  /* ---------------------------------------- */
  /*   Event handlers                         */
  /* ---------------------------------------- */

  static async #onCreateEmbedded(this: GurpsMoveModeEditor, event: PointerEvent, target: HTMLElement): Promise<void> {
    await createEmbeddedAction.call(this, event, target)

    await this.render()
  }

  /* ---------------------------------------- */

  static async #onDeleteEmbedded(this: GurpsMoveModeEditor, event: PointerEvent, target: HTMLElement): Promise<void> {
    await deleteEmbeddedAction.call(this, event, target)

    await this.render()
  }

  /* ---------------------------------------- */

  static async #onSubmitForm(
    this: GurpsMoveModeEditor,
    _event: Event | SubmitEvent,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended
  ): Promise<void> {
    await this.actor.update(foundry.utils.expandObject(formData.object) as Actor.UpdateData)
  }
}

/* ---------------------------------------- */

export { GurpsMoveModeEditor }
