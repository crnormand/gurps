import { DocumentSheetV2 } from '@gurps-types/foundry/document-sheet-v2.js'
import { GurpsModule } from '@gurps-types/gurps-module.js'

import {
  GurpsActorCombatSheet,
  GurpsActorEditorSheet,
  GurpsActorSheet,
  GurpsActorSheetReduced,
  GurpsActorSimplifiedSheet,
  GurpsActorTabSheet,
  GurpsInventorySheet,
} from './actor-sheet.js'
import { HitLocationEntryV2 } from './data/hit-location-entry.js'
import * as dataModels from './data/index.js'
import { MoveModeV2 } from './data/move-mode.js'
import { GurpsActorV2 } from './gurps-actor.js'
import { runMigration } from './migrate.js'
import { GurpsActorNpcModernSheet } from './modern/npc-sheet.js'
import { GurpsActorModernSheet } from './modern/sheet.js'
import * as sheets from './sheets/index.js'
import { ActorType } from './types.js'

interface ActorModule extends GurpsModule {
  dataModels: typeof dataModels
  sheets: typeof sheets
  migrate: typeof runMigration
  HitLocationEntry: typeof HitLocationEntryV2
  MoveMode: typeof MoveModeV2
  ActorType: typeof ActorType
}

function init() {
  console.log('GURPS | Initializing GURPS Actor module.')
  Hooks.on('init', () => {
    CONFIG.Actor.documentClass = GurpsActorV2

    CONFIG.Actor.dataModels = {
      [ActorType.Character]: dataModels.CharacterModel,
      [ActorType.GcsCharacter]: dataModels.GcsCharacterModel,
      [ActorType.GcsLoot]: dataModels.GcsLootModel,
    }

    foundry.documents.collections.Actors.unregisterSheet('core', foundry.appv1.sheets.ActorSheet)
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorCombatSheet, {
      label: 'Combat',
      makeDefault: false,
      types: [ActorType.LegacyCharacter, ActorType.LegacyEnemy],
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorEditorSheet, {
      label: 'Editor',
      types: [ActorType.LegacyCharacter, ActorType.LegacyEnemy],
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorSimplifiedSheet, {
      label: 'Simple',
      types: [ActorType.LegacyCharacter, ActorType.LegacyEnemy],
      makeDefault: false,
    })
    // @ts-expect-error: Not an ApplicationV2, we can safely ignore this though
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorNpcModernSheet, {
      label: 'NPC/mini',
      types: [ActorType.LegacyCharacter, ActorType.LegacyEnemy],
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsInventorySheet, {
      label: 'Inventory Only',
      types: [ActorType.LegacyCharacter, ActorType.LegacyEnemy],
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorTabSheet, {
      label: 'Tabbed Sheet',
      types: [ActorType.LegacyCharacter, ActorType.LegacyEnemy],
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorSheetReduced, {
      label: 'Reduced Mode',
      types: [ActorType.LegacyCharacter, ActorType.LegacyEnemy],
      makeDefault: false,
    })
    // @ts-expect-error: Not an ApplicationV2, we can safely ignore this though
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorModernSheet, {
      label: 'Modern',
      types: [ActorType.LegacyCharacter, ActorType.LegacyEnemy],
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorSheet, {
      // Add this sheet last
      label: 'Full (GCS)',
      types: [ActorType.LegacyCharacter, ActorType.LegacyEnemy],
      makeDefault: true,
    })

    foundry.documents.collections.Actors.registerSheet(
      'gurps',
      // TODO: fix type
      sheets.GurpsActorGcsSheet as unknown as DocumentSheetV2.AnyConstructor,
      {
        makeDefault: true,
        types: [ActorType.Character],
        label: 'GURPS.sheet.gcsActorSheet.label',
      }
    )
  })
}

export const Actor: ActorModule = {
  init,
  dataModels,
  sheets,
  migrate: runMigration,
  HitLocationEntry: HitLocationEntryV2,
  MoveMode: MoveModeV2,
  ActorType,
}
