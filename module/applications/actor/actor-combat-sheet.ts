import { ActorSheetGURPS } from './actor-sheet.js'

class ActorCombatSheetGURPS extends ActorSheetGURPS {
  static override DEFAULT_OPTIONS: foundry.applications.api.DocumentSheetV2.DefaultOptions = {
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
