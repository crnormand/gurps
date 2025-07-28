import { registerColorPickerSettings } from '../color-character-sheet/color-character-sheet-settings.js'
import { colorGurpsActorSheet } from '../color-character-sheet/color-character-sheet.js'
import { GurpsModule } from '../gurps-module.js'
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
import { CharacterModel } from './data/character.js'
import { GurpsActorV2 } from './gurps-actor.js'
import { migrateCharacter } from './migration/character-migration.js'
import { GurpsCharacterSheet } from './sheets/character-sheet.js'

/* ---------------------------------------- */

function init() {
  console.log('GURPS | Initializing GURPS Actor module.')
  Hooks.on('init', () => {
    CONFIG.Actor.documentClass = GurpsActorV2

    CONFIG.Actor.dataModels = {
      character: CharacterModel,
      enemy: CharacterModel,
    }

    // Register sheet application classes
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
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorSheet, {
      // Add this sheet last
      label: 'Full (GCS)',
      makeDefault: true,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsCharacterSheet, {
      label: 'Experimental',
      makeDefault: false,
    })

    GURPS.ActorSheets = { character: GurpsActorSheet }
  })

  Hooks.on('renderActorSheet', () => {
    /**
     * Added to color the rollable parts of the character sheet.
     * Made this part eslint compatible...
     * ~Stevil
     */
    registerColorPickerSettings()
    colorGurpsActorSheet()
  })
}

/* ---------------------------------------- */

async function migrate() {
  console.log('GURPS | Migrating Actor module data.')
  // Migration logic can be added here if needed in the future

  const migrations =
    game.actors?.reduce((acc: any[], actor) => {
      const version = actor._stats.systemVersion!
      if (foundry.utils.isNewerVersion(game.system!.version, version)) acc.push(migrateCharacter(actor.toObject()))
      return acc
    }, []) ?? []

  if (migrations.length) await foundry.documents.Actor.updateDocuments(migrations)
}

/* ---------------------------------------- */

export const Actor: GurpsModule = {
  init,
  migrate,
}
