'use strict'

import * as Settings from '../lib/miscellaneous-settings.js'
import RepeatingSequenceConverter from '../module/utilities/repeating-sequence.js'
import { i18n, i18n_f } from './utilities.js'

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

export class RulerGURPS extends Ruler {
  _getSegmentLabel(segment, totalDistance) { 
    totalDistance ??= this.totalDistance;
    const units = canvas.scene.grid.units
    let dist = (d, u) => {
      return `${Math.round(d * 100) / 100} ${u}`
    }
    let yards = this.convert_to_yards(totalDistance, units)
    let label = dist(segment.distance, units)
    let mod = this.yardsToSpeedRangePenalty(yards)
    GURPS.ModifierBucket.setTempRangeMod(mod)
    if (segment.last) {
      let total = `${dist(totalDistance, units)}`
      if (total != label) label += ` [${total}]`
    }
    return label + ` (${mod})`
  }

  _endMeasurement() {
    let addRangeMod = !this.draggedEntity // Will be false is using DragRuler and it was movement
    super._endMeasurement()
    if (addRangeMod) GURPS.ModifierBucket.addTempRangeMod()
  }

  convert_to_yards(numeric, Unit) {
    //console.log("entering convert to yards")
    let meter = 0
    let unit = Unit.toLowerCase()
    //console.log("Assigning Unit")
    //console.log("Unit in convert_to_yards is " + unit);
    if (unit == 'meters' || unit == 'meter' || unit == 'm') meter = numeric
    else if (unit == 'millimeters' || unit == 'millimeter' || unit == 'mm') meter = numeric / 1000
    else if (unit == 'kilometers' || unit == 'kilometer' || unit == 'km') meter = numeric * 1000
    else if (unit == 'miles' || unit == 'mile' || unit == 'mi') meter = numeric / 0.00062137
    else if (unit == 'inches' || unit == 'inch' || unit == 'in') meter = numeric / 39.37
    else if (unit == 'centimeters' || unit == 'centimeter' || unit == 'cm') meter = numeric / 100
    else if (unit == 'feet' || unit == 'foot' || unit == 'ft') meter = numeric / 3.2808
    else if (unit == 'yards' || unit == 'yard' || unit == 'yd' || unit == 'y') meter = numeric / (3.2808 / 3)
    else if (unit == 'lightyears' || unit == 'lightyear' || unit == 'ly') meter = numeric * 9460730472580800
    else if (unit == 'astronomical units' || unit == 'astronomical unit' || unit == 'au') meter = numeric * 149597870700
    else if (unit == 'parsecs' || unit == 'parsec' || unit == 'pc') meter = numeric * 30856776376340068
    return meter * 1.0936
  }

  yardsToSpeedRangePenalty(yards) {
    let currentValue = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_RANGE_STRATEGY)
    if (currentValue == 'Standard') {
      return GURPS.SSRT.getModifier(yards)
    } else {
      for (let range of GURPS.rangeObject.ranges) {
        if (typeof range.max === 'string')
          // Handles last distance being "500+"
          return range.penalty
        if (yards <= range.max) return range.penalty
      }
    }
  }
}

export class GURPSRange {
  constructor() {
    // this.setup()
    this.update()
    this._buildModifiers()
  }

  static get basicSetRanges() {
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
        moddesc: i18n_f('GURPS.modifierRange', { range: r[i] }),
        max: r[i],
        penalty: r[i + 1],
        desc: `${r[i]} yds`,
      }
      basicSetRanges.push(d)
    }
    return basicSetRanges
  }

  static get monsterHunter2Ranges() {
    const monsterHunter2Ranges = [
      {
        moddesc: i18n('GURPS.modifierRangeMHClose'),
        max: 5,
        penalty: 0,
        description: i18n('GURPS.modifierRangeMHCloseDesc'),
      },
      {
        moddesc: i18n('GURPS.modifierRangeMHShort'),
        max: 20,
        penalty: -3,
        description: i18n('GURPS.modifierRangeMHShortDesc'),
      },
      {
        moddesc: i18n('GURPS.modifierRangeMHMedium'),
        max: 100,
        penalty: -7,
        description: i18n('GURPS.modifierRangeMHMediumDesc'),
      },
      {
        moddesc: i18n('GURPS.modifierRangeMHLong'),
        max: 500,
        penalty: -11,
        description: i18n('GURPS.modifierRangeMHLongDesc'),
      },
      {
        moddesc: i18n('GURPS.modifierRangeMHExtreme'),
        max: '500+', // Finaly entry.   We will check for "is string" to assume infinite
        penalty: -15,
        description: i18n('GURPS.modifierRangeMHExtremeDesc'),
      },
    ]
    return monsterHunter2Ranges
  }

  static get penaltiesPerTenRanges() {
    const penaltiesPerTenRanges = []
    for (let i = 0; i < 50; i++) {
      penaltiesPerTenRanges.push({
        moddesc: i18n_f('GURPS.modifierRange', { range: (i + 1) * 10 }),
        max: (i + 1) * 10,
        penalty: -i,
        desc: `${(i + 1) * 10} yds`,
      })
      return penaltiesPerTenRanges
    }

    // Must be kept in order... checking range vs Max.   If >Max, go to next entry.
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
    console.debug(currentValue)

    switch (currentValue) {
      case 'Standard': {
        this.ranges = GURPSRange.basicSetRanges
        break
      }
      case 'TenPenalties': {
        this.ranges = GURPSRange.penaltiesPerTenRanges
        break
      }
      default: {
        this.ranges = GURPSRange.monsterHunter2Ranges
        break
      }
    }

    this._buildModifiers()

    // update modifier bucket
    if (!!GURPS.ModifierBucket) GURPS.ModifierBucket.refresh()

    // FYI update all actors
    for (const actor of game.actors.contents) {
      if (actor.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
        // Return true if the current game user has observer or owner rights to an actor
        await actor.update({ ranges: this.ranges })
    }
  }
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

// Must be kept in order... checking range vs Max.   If >Max, go to next entry.
/* Example code:
		for (let range of GURPS.ranges) {
		  if (yards <= range.max)
			return range.penalty
		}
*/

export function setupRanges() {
  // GURPS.SSRT = new SizeAndSpeedRangeTable()
  return new SizeAndSpeedRangeTable()
  // GURPS.SSRT = SSRT
}

// Hooks.on('ready', () => GURPS.SSRT = SSRT)
