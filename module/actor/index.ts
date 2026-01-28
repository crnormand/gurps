import { GurpsModule } from 'module/gurps-module.js'

import {
  GurpsActorCombatSheet,
  GurpsActorEditorSheet,
  GurpsActorNpcSheet,
  GurpsActorSheet,
  GurpsActorSheetReduced,
  GurpsActorSimplifiedSheet,
  GurpsActorTabSheet,
  GurpsInventorySheet,
} from './actor-sheet.js'
import * as dataModels from './data/index.ts'
import { GurpsActorV2 } from './gurps-actor.ts'
import { GurpsActorModernSheet } from './modern/sheet.js'

function init() {
  console.log('GURPS | Initializing GURPS Actor module.')
  Hooks.on('init', () => {
    CONFIG.Actor.documentClass = GurpsActorV2

    CONFIG.Actor.dataModels = {
      characterV2: dataModels.CharacterModel,
      gcsCharacter: dataModels.GcsCharacterModel,
      gcsLoot: dataModels.GcsLootModel,
    }

    foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet)
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorCombatSheet, {
      label: 'Combat',
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorEditorSheet, {
      label: 'Editor',
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorSimplifiedSheet, {
      label: 'Simple',
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorNpcSheet, {
      label: 'NPC/mini',
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsInventorySheet, {
      label: 'Inventory Only',
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorTabSheet, {
      label: 'Tabbed Sheet',
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorSheetReduced, {
      label: 'Reduced Mode',
      makeDefault: false,
    })
    // @ts-expect-error: Not an ApplicationV2, we can safely ignore this though
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorModernSheet, {
      label: 'Modern',
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorSheet, {
      // Add this sheet last
      label: 'Full (GCS)',
      makeDefault: true,
    })
  })
}

export const Actor: GurpsModule = {
  init,
}
