import { ActorSheetGURPS } from './actor-sheet.js'
import DocumentSheetV2 = foundry.applications.api.DocumentSheetV2

class ActorCombatSheetGURPS extends ActorSheetGURPS {
  static override DEFAULT_OPTIONS: DocumentSheetV2.PartialConfiguration<
    DocumentSheetV2.Configuration<Actor.Implementation>
  > &
    object = {
    position: {
      width: 670,
      height: 'auto',
    },
  }

  /* ---------------------------------------- */

  static override PARTS = {
    main: {
      id: 'sheet',
      template: 'systems/gurps/templates/actor/combat-sheet.hbs',
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
}

export { ActorCombatSheetGURPS }
