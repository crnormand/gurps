'use strict'

import { displayMod } from './utilities.js'

export const SYSTEM_NAME = 'gurps'
export const SETTING_NAME = 'rangeStrategy'

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

    Hooks.once('init', async function () {
      game.GURPS = GURPS

      /* Define Settings */
      game.settings.register(SYSTEM_NAME, SETTING_NAME, {
        name: 'Default range modifier strategy:',
        hint: 'Sets the formula to use to calculate range penalties.',
        scope: 'world',
        config: true,
        type: String,
        choices: {
          'Standard': 'Size and Speed/Range Table',
          'Simplified': 'Monster Hunters 2 Range Bands'
        },
        default: 'Standard',
        onChange: value => self.update()
      })
    })

    // Set the range to whatever the setting is upon opening the world.
    // Have to do it this way because the order of "init Hooks" is indeterminate.
    // This will run after all init hooks have been processed.
    Hooks.once('ready', async function () {
      self.update()

			// Replace the range ruler with our own.
		  Ruler.prototype._getSegmentLabel = (segmentDistance, totalDistance, isTotal) => {
		    const units = canvas.scene.data.gridUnits;
				let dist = (d, u) => { return `${Math.round(d * 100) / 100} ${u}` };
		
		    let label = dist(segmentDistance, units);
				let mod = self.yardsToSpeedRangePenalty(totalDistance);
				game.GURPS.ModifierBucket.setTempRangeMod(mod);
		    if (isTotal && segmentDistance !== totalDistance) {
		        label += ` [${dist(totalDistance, units)}]`;
		    }
				return label + ` (${mod})`;
			}

			Ruler.prototype._endMeasurementOrig=Ruler.prototype._endMeasurement;	
			Ruler.prototype._endMeasurement = function ()  {
				this._endMeasurementOrig();
				game.GURPS.ModifierBucket.addTempRangeMod();
			}
    })
  }

	yardsToSpeedRangePenalty(yards) {
	  for (let range of this.ranges) {
			if (typeof range.max === 'string')			// Handles last distance being "500+"
				return range.penalty;
			if (yards <= range.max)
				return range.penalty;
	 }
  }

  _buildModifiers() {
    this.modifiers = []
    this.ranges.forEach(band => {
      if (band.penalty != 0) {
        this.modifiers.push(displayMod(band.penalty) + ' ' + band.moddesc)
      }
    })
  }

  async update() {
    let currentValue = game.settings.get(SYSTEM_NAME, SETTING_NAME)
    console.log(currentValue)

    if (currentValue === 'Standard') {
      this.ranges = basicSetRanges
    }
    else {
      this.ranges = monsterHunter2Ranges
    }
    this._buildModifiers()

    // update modifier bucket
    ui.modifierbucket = game.GURPS.ModifierBucket
    if (typeof ui.modifierbucket !== 'undefined')
      ui.modifierbucket.refresh()

    // FYI update all actors
    for (const actor of game.actors.entities) {
      if (actor.permission >= CONST.ENTITY_PERMISSIONS.OBSERVER)		// Return true if the current game user has observer or owner rights to an actor
        await actor.update({ ranges: this.ranges })
    }
  }
}


// Must be kept in order... checking range vs Max.   If >Max, go to next entry.
/* Example code:
        for (let range of game.GURPS.ranges) {
          if (yards <= range.max)
            return range.penalty
        }
*/
const monsterHunter2Ranges = [
  {
    moddesc: "Close range (5 yds)",
    max: 5,
    penalty: 0,
    description: "Can touch or strike foe"
  },
  {
    moddesc: "Short range (20 yds)",
    max: 20,
    penalty: -3,
    description: "Can talk to foe; pistol or muscle-powered missile range"
  },
  {
    moddesc: "Medium range (100 yds)",
    max: 100,
    penalty: -7,
    description: "Can only shout to foe; shotgun or SMG range"
  },
  {
    moddesc: "Long range (500 yds)",
    max: 500,
    penalty: -11,
    description: "Opponent out of earshot; rifle range"
  },
  {
    moddesc: "Extreme range (500+ yds)",
    max: "500+",				// Finaly entry.   We will check for "is string" to assume infinite
    penalty: -15,
    desc: "Rival difficult to even see; sniper range"
  }
]

// Must be kept in order... checking range vs Max.   If >Max, go to next entry.
const basicSetRanges = []

// Yes, I should be able to do this programatically... but my brain hurts right now, so there.
const r = [
  2, 0,
  3, -1,
  5, -2,
  7, -3,
  10, -4,
  15, -5,
  20, -6,
  30, -7,
  50, -8,
  70, -9,
  100, -10,
  150, -11,
  200, -12,
  300, -13,
  500, -14,
  "500+", -15]

for (let i = 0; i < r.length; i = i + 2) {
  let d = {
    moddesc: `for range/speed ${r[i]} yds`,
    max: r[i],
    penalty: r[i + 1],
    desc: `${r[i]} yds`
  }
  basicSetRanges.push(d)
}

