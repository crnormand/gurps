import { GurpsModule } from '@gurps-types/gurps-module.js'

import { HitLocationEntryV2 } from './data/hit-location-entry.js'
import * as dataModels from './data/index.js'
import { MoveModeV2 } from './data/move-mode.js'
import { NoteV2 } from './data/note.js'
import { GurpsActorV2 } from './gurps-actor.js'
import { migrations } from './migrations/index.js'
import { GurpsActorNpcModernSheet } from './modern/npc-sheet.js'
import { GurpsActorModernSheet } from './modern/sheet.js'
import * as sheets from './sheets/index.js'
import { ActorType } from './types.js'

interface ActorModule extends GurpsModule {
  dataModels: typeof dataModels
  sheets: typeof sheets
  // migrate: typeof runMigration
  HitLocationEntry: typeof HitLocationEntryV2
  MoveMode: typeof MoveModeV2
  ActorType: typeof ActorType
}

function init() {
  console.log('GURPS | Initializing GURPS Actor module.')

  Hooks.on('init', async () => {
    CONFIG.Actor.documentClass = GurpsActorV2

    CONFIG.Actor.dataModels = {
      character: dataModels.CharacterModel,
      enemy: dataModels.CharacterModel,
      characterV2: dataModels.CharacterModel,
      gcsCharacter: dataModels.GcsCharacterModel,
      gcsLoot: dataModels.GcsLootModel,
    }

    // @ts-expect-error: Invalid type
    GURPS.CONFIG ||= {}
    // @ts-expect-error: Invalid type
    GURPS.CONFIG.PseudoDocument ||= {}
    // @ts-expect-error: Invalid type
    GURPS.CONFIG.PseudoDocument.Types ||= {}
    GURPS.CONFIG.PseudoDocument.Types.HitLocation = HitLocationEntryV2
    GURPS.CONFIG.PseudoDocument.Types.MoveMode = MoveModeV2
    GURPS.CONFIG.PseudoDocument.Types.Note = NoteV2

    // @ts-expect-error: Not an ApplicationV2, we can safely ignore this though
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorNpcModernSheet, {
      label: 'NPC/mini',
      types: [ActorType.Character],
      makeDefault: false,
    })
    // @ts-expect-error: Not an ApplicationV2, we can safely ignore this though
    foundry.documents.collections.Actors.registerSheet('gurps', GurpsActorModernSheet, {
      label: 'Modern',
      types: [ActorType.Character],
      makeDefault: false,
    })
    foundry.documents.collections.Actors.registerSheet(
      'gurps',
      sheets.GurpsActorGcsSheet as unknown as foundry.applications.api.DocumentSheet.AnyConstructor,
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
  migrations,
  HitLocationEntry: HitLocationEntryV2,
  MoveMode: MoveModeV2,
  ActorType,
}
