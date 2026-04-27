import { DeepPartial, HandlebarsApplicationMixin } from '@gurps-types/foundry/index.js'
import { bindInlineEdit } from '@module/actor/sheets/modern/inline-edit-handler.js'
import { PseudoDocumentSheet } from '@module/pseudo-document/pseudo-document-sheet.js'
import { syncLabelWidths } from '@module/util/dom.js'
import { getGame } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'

import { PseudoDocument } from './pseudo-document.js'
import { TypedPseudoDocument } from './typed-pseudo-document.js'

/* ---------------------------------------- */

namespace GenericPseudoSheet {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface RenderOptions extends PseudoDocumentSheet.RenderOptions {}

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface Configuration<Doc extends PseudoDocument.Any = PseudoDocument.Any>
    extends PseudoDocumentSheet.Configuration<Doc> {}

  /* ---------------------------------------- */

  export type DefaultOptions = PseudoDocumentSheet.DefaultOptions

  /* ---------------------------------------- */

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface RenderContext<Doc extends PseudoDocument.Any = PseudoDocument.Any>
    extends PseudoDocumentSheet.RenderContext<Doc> {}
}

/* ---------------------------------------- */

class GenericPseudoSheet<Doc extends PseudoDocument.Any = PseudoDocument.Any> extends PseudoDocumentSheet<Doc> {
  static override DEFAULT_OPTIONS: PseudoDocumentSheet.DefaultOptions = {
    classes: ['modern-item-sheet'],
    window: {
      resizable: true,
    },
    position: {
      width: 600,
      height: 600,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    header: {
      template: systemPath('templates/pseudo-document/header.hbs'),
    },
    details: {
      template: systemPath('templates/pseudo-document/details.hbs'),
      scrollable: [''],
    },
  }

  /* ---------------------------------------- */

  override get title(): string {
    return this.pseudoDocument?.name ?? getGame().i18n.localize('DOCUMENT.' + this.pseudoDocument?.documentName)
  }

  /* ---------------------------------------- */
  /*  Context Preparation                     */
  /* ---------------------------------------- */

  protected _getTypeContext(): { type: string; icon: string } {
    const pseudo = this.pseudoDocument
    let type = pseudo?.documentName ?? ''

    if (pseudo instanceof TypedPseudoDocument) {
      type = (pseudo as unknown as TypedPseudoDocument).type ?? ''
    }

    return { type, icon: pseudo?.metadata.icon ?? '' }
  }

  /* ---------------------------------------- */

  protected override async _renderFrame(options: DeepPartial<GenericPseudoSheet.RenderOptions>): Promise<HTMLElement> {
    const frame = await super._renderFrame(options)

    const titleElement = this.window.header?.querySelector('h1')

    const typeContext = this._getTypeContext()

    if (titleElement) {
      const iconHtml = document.createElement('i')

      iconHtml.classList.add(...typeContext.icon.split(' '))

      this.window.header?.insertBefore(iconHtml, titleElement)
    }

    return frame
  }

  /* ---------------------------------------- */
  /*  Non-Action Bindings                     */
  /* ---------------------------------------- */

  protected override async _onRender(
    context: GenericPseudoSheet.RenderContext,
    options: PseudoDocumentSheet.RenderOptions
  ): Promise<void> {
    super._onRender(context, options)
    syncLabelWidths(this.element)

    const typeContext = this._getTypeContext()

    this.element.dataset.type = typeContext.type

    bindInlineEdit(this.element, {
      displaySelector: '.ms-name-display',
      containerSelector: '.ms-name-container',
      inputSelector: 'input[name="name"]',
      fieldType: 'name',
    })
  }
}

export { GenericPseudoSheet }
