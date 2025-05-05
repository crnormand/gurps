import { AnyObject, DeepPartial } from 'fvtt-types/utils'
import { ActorSheetGURPS } from './actor-sheet.js'
import DocumentSheetV2 = foundry.applications.api.DocumentSheetV2
import { parselink } from '../../../lib/parselink.js'

class ActorSimplifiedSheetGURPS extends ActorSheetGURPS {
  static override DEFAULT_OPTIONS: DocumentSheetV2.DefaultOptions = {
    position: {
      width: 820,
      height: 900,
    },
  }

  /* ---------------------------------------- */

  static override PARTS = {
    main: {
      id: 'sheet',
      template: 'systems/gurps/templates/simplified.hbs',
      scrollable: [
        '.gurpsactorsheet',
        '#advantages',
        '#reactions',
        '#melee',
        '#ranged',
        '#skills',
        '#spells',
        '#equipmentcarried',
        '#equipmentother',
        '#notes',
      ],
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<DocumentSheetV2.RenderOptions> & { isFirstRender: boolean }
  ): Promise<ActorSheetGURPS.RenderContext> {
    const data = await super._prepareContext(options)
    return {
      ...data,
      dodge: this.actor.getCurrentDodge(),
      defense: this.actor.getTorsoDr(),
    }
  }

  /* ---------------------------------------- */

  protected override async _onRender(
    _context: DeepPartial<AnyObject>,
    _options: DeepPartial<DocumentSheetV2.RenderOptions>
  ): Promise<void> {
    await super._onRender(_context, _options)
    const html = $(this.element)

    html.find('.rollableicon').on('click', event => this._onClickRollableIcon(event))
  }

  /* ---------------------------------------- */

  async _onClickRollableIcon(event: JQuery.ClickEvent): Promise<void> {
    event.preventDefault()
    let element = event.currentTarget
    let val = element.dataset.value
    let parsed = parselink(val)
    GURPS.performAction(parsed.action, this.actor, event)
  }
}

export { ActorSimplifiedSheetGURPS }
