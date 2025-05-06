import { ActorSheetGURPS } from './actor-sheet.js'

class ActorReducedSheetGURPS extends ActorSheetGURPS {
  static override PARTS = {
    main: {
      id: 'sheet',
      template: 'systems/gurps/templates/actor/actor-sheet-gcs-reduced.hbs',
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

export { ActorReducedSheetGURPS }
