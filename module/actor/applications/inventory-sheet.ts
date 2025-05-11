import { ActorSheetGURPS } from './actor-sheet.js'
import DocumentSheetV2 = foundry.applications.api.DocumentSheetV2

class InventorySheetGURPS extends ActorSheetGURPS {
  static override DEFAULT_OPTIONS: DocumentSheetV2.PartialConfiguration<
    DocumentSheetV2.Configuration<Actor.Implementation>
  > &
    object = {
    classes: ['npc-sheet', 'sheet', 'actor'],
    position: {
      width: 700,
      height: 400,
    },
  }

  /* ---------------------------------------- */

  static override PARTS = {
    main: {
      id: 'sheet',
      template: 'systems/gurps/templates/inventory-sheet.hbs',
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

export { InventorySheetGURPS }
