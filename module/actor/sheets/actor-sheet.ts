import { DeepPartial } from 'fvtt-types/utils'
import api = foundry.applications.api
import { GurpsDocumentSheetMixin } from '../../applications/api/index.js'

// @ts-expect-error: Not being recognised quite right but works OK in practice.
class GurpsActorSheet extends GurpsDocumentSheetMixin(foundry.applications.sheets.ActorSheet) {
  protected override async _prepareContext(
    options: DeepPartial<api.DocumentSheet.RenderOptions> & { isFirstRender: boolean }
  ) {
    const context = await super._prepareContext(options)
    Object.assign(context, {
      items: this.document.items,
    })

    return context
  }
}

/* ---------------------------------------- */

// NOTE: Need to explicitly define the document type here because it is not being properly
// passed through to the mixin class
interface GurpsActorSheet {
  get document(): Actor.Implementation
}

/* ---------------------------------------- */

export { GurpsActorSheet }
