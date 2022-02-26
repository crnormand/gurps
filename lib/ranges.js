'use strict'

import * as Settings from '../lib/miscellaneous-settings.js'
import RepeatingSequenceConverter from '../module/utilities/repeating-sequence.js'

/*
  Defines the range strategy used throughout the application. A range strategy
  is defined as an ordered (closest range to farthest range) array of range 
  bands. A range band is defined as a structure like this:

  {
    moddesc: <String: text to use in the modifier bucket>,
    max: <num: number of yards that define the maximum distance of this band>,				
    penalty: <num: modifier to use for ranged attacks in this band>,
    desc: <String: text that describes the range>
  }

  Responsibilities:

  - Defines a world setting to set the range strategy. Currently supported: 
    * Standand (Size and Speed/Range Table from Basic).
    * Simplifed (Range bands from Monster Hunters 2: The Enemy).
    * -1 per 10 yards
   
  - On update of the setting, update the modifier bucket and all actors.

  - On start up (a 'ready' hook) set the range bands and modifiers based 
    on the current setting value.
    
  - Maintains an instance variable (ranges) that contains the current set of 
    range bands based on the chosen strategy. 

  - Maintains an instance variable (modifiers) that contains an array of 
    modifier text for the modifier bucket.
 */
export default class GURPSRange {
  constructor() {
    this.setup()
    this.ranges = basicSetRanges
    this._buildModifiers()
  }

  setup() {
    let self = this

    // Set the range to whatever the setting is upon opening the world.
    // Have to do it this way because the order of "init Hooks" is indeterminate.
    // This will run after all init hooks have been processed.
    Hooks.once('ready', async function () {
      self.update()

      // Replace the range ruler with our own.
      Ruler.prototype._getSegmentLabel = (segmentDistance, totalDistance, isTotal) => {
        const units = canvas.scene.data.gridUnits
        let dist = (d, u) => {
          return `${Math.round(d * 100) / 100} ${u}`
        }

        let label = dist(segmentDistance, units)
        let mod = self.yardsToSpeedRangePenalty(totalDistance)
        GURPS.ModifierBucket.setTempRangeMod(mod)
        if (isTotal && segmentDistance !== totalDistance) {
          label += ` [${dist(totalDistance, units)}]`
        }
        return label + ` (${mod})`
      }

      if (!Ruler.prototype._endMeasurementOrig) {
        // Only monkey patch if we haven't done so before.
        Ruler.prototype._endMeasurementOrig = Ruler.prototype._endMeasurement
        Ruler.prototype._endMeasurement = function () {
          let addRangeMod = !this.draggedEntity // Will be false is using DragRuler and it was movement
          this._endMeasurementOrig()
          if (addRangeMod) GURPS.ModifierBucket.addTempRangeMod()
        }
      }
    })
  }

  yardsToSpeedRangePenalty(yards) {
    let currentValue = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_RANGE_STRATEGY)
    if (currentValue == 'Standard') {
      return SSRT.getModifier(yards)
    } else {
      for (let range of this.ranges) {
        if (typeof range.max === 'string')
          // Handles last distance being "500+"
          return range.penalty
        if (yards <= range.max) return range.penalty
      }
    }
  }

  _buildModifiers() {
    /** @type {import('../module/modifier-bucket/bucket-app.js').Modifier[]} */
    let m = []
    this.ranges.forEach(band => {
      if (band.penalty != 0) GURPS.ModifierBucket.addModifier(band.penalty, band.moddesc, m)
    })
    this.modifiers = m.map(e => e.mod + ' ' + e.desc)
  }

  async update() {
    let currentValue = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_RANGE_STRATEGY)
    console.log(currentValue)

    switch (currentValue) {
      case 'Standard': {
        this.ranges = basicSetRanges
        break
      }
      case 'TenPenalties': {
        this.ranges = penaltiesPerTenRanges
        break
      }
      default: {
        this.ranges = monsterHunter2Ranges
        break
      }
    }

    this._buildModifiers()

    // update modifier bucket
    if (!!GURPS.ModifierBucket) GURPS.ModifierBucket.refresh()

    // FYI update all actors
    for (const actor of game.actors.contents) {
      if (actor.permission >= CONST.ENTITY_PERMISSIONS.OBSERVER)
        // Return true if the current game user has observer or owner rights to an actor
        await actor.update({ ranges: this.ranges })
    }
  }
}

// Must be kept in order... checking range vs Max.   If >Max, go to next entry.
/* Example code:
        for (let range of GURPS.ranges) {
          if (yards <= range.max)
            return range.penalty
        }
*/
const monsterHunter2Ranges = [
  {
    moddesc: 'Close range (5 yds)',
    max: 5,
    penalty: 0,
    description: 'Can touch or strike foe',
  },
  {
    moddesc: 'Short range (20 yds)',
    max: 20,
    penalty: -3,
    description: 'Can talk to foe; pistol or muscle-powered missile range',
  },
  {
    moddesc: 'Medium range (100 yds)',
    max: 100,
    penalty: -7,
    description: 'Can only shout to foe; shotgun or SMG range',
  },
  {
    moddesc: 'Long range (500 yds)',
    max: 500,
    penalty: -11,
    description: 'Opponent out of earshot; rifle range',
  },
  {
    moddesc: 'Extreme range (500+ yds)',
    max: '500+', // Finaly entry.   We will check for "is string" to assume infinite
    penalty: -15,
    desc: 'Rival difficult to even see; sniper range',
  },
]

// Must be kept in order... checking range vs Max.   If >Max, go to next entry.
const basicSetRanges = []

// Yes, I should be able to do this programatically... but my brain hurts right now, so there.
const r = [
  2,
  0,
  3,
  -1,
  5,
  -2,
  7,
  -3,
  10,
  -4,
  15,
  -5,
  20,
  -6,
  30,
  -7,
  50,
  -8,
  70,
  -9,
  100,
  -10,
  150,
  -11,
  200,
  -12,
  300,
  -13,
  500,
  -14,
  '500+',
  -15,
]

for (let i = 0; i < r.length; i = i + 2) {
  let d = {
    moddesc: `for range/speed ${r[i]} yds`,
    max: r[i],
    penalty: r[i + 1],
    desc: `${r[i]} yds`,
  }
  basicSetRanges.push(d)
}

const penaltiesPerTenRanges = []
for (let i = 0; i < 50; i++) {
  penaltiesPerTenRanges.push({
    moddesc: `for range/speed ${(i + 1) * 10} meters`,
    max: (i + 1) * 10,
    penalty: -i,
    desc: `${(i + 1) * 10} m`,
  })
}

class SizeAndSpeedRangeTable {
  constructor() {
    this._table = new RepeatingSequenceConverter([2, 3, 5, 7, 10, 15])
  }

  // pass in distance in yards, get back modifier
  getModifier(yards) {
    return -this._table.valueToIndex(yards)
  }

  // pass in modifier, get distance in yards
  getDistance(modifier) {
    return this._table.indexToValue(modifier)
  }

  // pass in distance in yards, get back the furthest distance that has the same modifier
  ceil(yards) {
    return this._table.ceil(measure)
  }
}

const SSRT = new SizeAndSpeedRangeTable()
