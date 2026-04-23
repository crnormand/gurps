import { DataModel } from '@gurps-types/foundry/index.js'
import { HitLocationEntryV2 } from '@module/actor/data/hit-location-entry.js'
import { HitLocationTables } from '@rules/hit-locations/tables.js'

export function defaultHitLocations(): Record<string, DataModel.CreateData<DataModel.SchemaOf<HitLocationEntryV2>>> {
  const locations: Record<string, DataModel.CreateData<DataModel.SchemaOf<HitLocationEntryV2>>> = {}

  const table = HitLocationTables.humanoid

  const rollFormula = table.roll
  const minRoller = new foundry.dice.Roll(rollFormula)
  const maxRoller = new foundry.dice.Roll(rollFormula)
  const minRoll = minRoller.evaluateSync({ minimize: true }).total
  const maxRoll = maxRoller.evaluateSync({ maximize: true }).total

  let currentRoll = minRoll

  HitLocationTables.humanoid.locations.forEach(location => {
    let rollMin: number | null = null
    let rollMax: number | null = null
    let slots = location.slots || 0

    if (slots > 0) {
      if (currentRoll + slots > maxRoll) {
        console.warn(
          `GURPS | Hit location "${location.name}" has more slots (${slots}) than remaining rolls (${maxRoll - currentRoll + 1}). Ignoring extra slots.`
        )

        slots = 0
      }
    }

    if (slots > 0) {
      rollMin = currentRoll
      if (slots === 1) rollMax = currentRoll
      else rollMax = currentRoll + slots - 1
    }

    const rollText = rollMin && rollMax ? (rollMin === rollMax ? `${rollMin}` : `${rollMin}-${rollMax}`) : '-'

    currentRoll += slots

    const locationData: DataModel.CreateData<DataModel.SchemaOf<HitLocationEntryV2>> = {
      _id: foundry.utils.randomID(),
      name: '',
      img: null,
      sort: 0,
      flags: {},
      where: location.name,
      import: location.dr,
      _dr: location.dr,
      penalty: location.penalty,
      rollText,
      _damageType: null,
      split: {},
      drMod: 0,
      drItem: 0,
      drCap: location.dr,
    }

    locations[locationData._id as string] = locationData
  })

  return locations
}
