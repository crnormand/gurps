import { DeepPartial } from 'fvtt-types/utils'
import api = foundry.applications.api
import { constructHTMLButton, htmlQuerySelectorAll } from '../../utilities/dom.js'

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

    /* ---------------------------------------- */

    /**
     * Is this sheet in Edit Mode?
     */
    get isEditMode(): boolean {
      return this._mode === GurpsDocumentSheet.MODES.EDIT
    }

    /* ---------------------------------------- */

    protected _disableFields() {
      const selector = `.window-content :is(${[
        'INPUT',
        'SELECT',
        'TEXTAREA',
        // 'BUTTON',
        'FILE-PICKER',
        'MULTI-SELECT',
        'PROSE-MIRROR',
      ].join(', ')}):not(.always-interactive)`
      for (const element of htmlQuerySelectorAll(this.element, selector) as NodeListOf<HTMLInputElement>) {
        if (element.closest('prose-mirror[open]')) continue // Skip active ProseMirror editors
        if (element.tagName === 'TEXTAREA') element.readOnly = true
        else element.disabled = true
      }
    }

    /* ---------------------------------------- */

    /** @inheritdoc */
    protected override async _renderFrame(options: DeepPartial<api.Application.RenderOptions>) {
      const frame = await super._renderFrame(options)
      const buttons = [
        constructHTMLButton({
          label: '',
          classes: ['header-control', 'icon', 'fa-solid', 'fa-user-lock'],
          dataset: { action: 'toggleMode', tooltip: 'GURPS.Sheet.ToggleMode' },
        }),
      ]

      if ((this.document.system as any | undefined)?.source) {
        buttons.push(
          constructHTMLButton({
            label: '',
            classes: ['header-control', 'icon', 'fa-solid', 'fa-book'],
            dataset: { action: 'updateSource', tooltip: 'GURPS.Sheet.UpdateSource' },
          })
        )
      }
      this.window.controls?.after(...buttons)

      return frame
    }
    /* ---------------------------------------- */

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
