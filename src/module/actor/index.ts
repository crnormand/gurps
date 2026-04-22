import { DocumentSheetV2 } from '@gurps-types/foundry/document-sheet-v2.js'
import { GurpsModule } from '@gurps-types/gurps-module.js'

import { HitLocationEntryV2 } from './data/hit-location-entry.js'
import * as dataModels from './data/index.js'
import { MoveModeV2 } from './data/move-mode.js'
import { GurpsActorV2 } from './gurps-actor.js'
import { migrations } from './migrations/index.js'
import * as sheets from './sheets/index.js'
import { ActorType } from './types.js'

interface ActorModule extends GurpsModule {
  dataModels: typeof dataModels
  sheets: typeof sheets
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
  migrations,
  HitLocationEntry: HitLocationEntryV2,
  MoveMode: MoveModeV2,
  ActorType,
}
