import { DeepPartial } from 'fvtt-types/utils'
import api = foundry.applications.api

/* ---------------------------------------- */

export default function <BaseClass extends api.DocumentSheet.AnyConstructor>(base: BaseClass) {
  return class GurpsDocumentSheet extends api.HandlebarsApplicationMixin(base) {
    /* ---------------------------------------- */

    static override DEFAULT_OPTIONS: api.DocumentSheet.DefaultOptions = {
      classes: ['gurps2'],
      form: {
        submitOnChange: true,
        closeOnSubmit: false,
      },
      window: {
        resizable: true,
      },
    }

    /* ---------------------------------------- */

    /**
     * Available sheet modes
     * @enum {number}
     */
    static MODES = Object.freeze({
      PLAY: 1,
      EDIT: 2,
    })

    /* ---------------------------------------- */

    protected _mode: (typeof GurpsDocumentSheet.MODES)[keyof typeof GurpsDocumentSheet.MODES] =
      GurpsDocumentSheet.MODES.PLAY

    /* ---------------------------------------- */

    /**
     * Is this sheet in Play Mode?
     */
    get isPlayMode(): boolean {
      return this._mode === GurpsDocumentSheet.MODES.PLAY
    }

    /* -------------------------------------------------- */

    /**
     * Is this sheet in Edit Mode?
     */
    get isEditMode(): boolean {
      return this._mode === GurpsDocumentSheet.MODES.EDIT
    }

    /* -------------------------------------------------- */

    protected override async _prepareContext(
      options: DeepPartial<api.DocumentSheet.RenderOptions> & { isFirstRender: boolean }
    ) {
      const context = await super._prepareContext(options)
      Object.assign(context, {
        isPlay: this.isPlayMode,
        owner: (this.document as any).isOwner,
        limited: (this.document as any).limited,
        document: this.document,
        system: this.document.system,
      })

      return context
    }
  }
}
