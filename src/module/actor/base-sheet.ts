import { HandlebarsActorSheetV2Constructor } from '@gurps-types/foundry/actor-sheet-v2.js'

/* ---------------------------------------- */

// See module/types/foundry/actor-sheet-v2.ts for why we need this type assertion
const GurpsBaseActorSheet = <Type extends Actor.SubType>() =>
  foundry.applications.api.HandlebarsApplicationMixin(
    foundry.applications.sheets.ActorSheetV2
  ) as unknown as HandlebarsActorSheetV2Constructor<Actor.OfType<Type>>

/* ---------------------------------------- */

export { GurpsBaseActorSheet }
