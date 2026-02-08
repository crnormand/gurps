'use strict'

import * as Settings from '../lib/miscellaneous-settings.js'

import { SizeAndSpeedRangeTable } from './size-speed-range-table.js'

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
	  * Standard (Size and Speed/Range Table from Basic).
	  * Simplified (Range bands from Monster Hunters 2: The Enemy).
	  * -1 per 10 yards
   
  - On update of the setting, update the modifier bucket and all actors.

  - On start up (a 'ready' hook) set the range bands and modifiers based 
	on the current setting value.
    
  - Maintains an instance variable (ranges) that contains the current set of 
	range bands based on the chosen strategy. 

  - Maintains an instance variable (modifiers) that contains an array of 
	modifier text for the modifier bucket.
 */

export class GurpsRange {
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
        moddesc: game.i18n.format('GURPS.modifierRange', { range: r[i] }),
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
        moddesc: game.i18n.localize('GURPS.modifierRangeMHClose'),
        max: 5,
        penalty: 0,
        description: game.i18n.localize('GURPS.modifierRangeMHCloseDesc'),
      },
      {
        moddesc: game.i18n.localize('GURPS.modifierRangeMHShort'),
        max: 20,
        penalty: -3,
        description: game.i18n.localize('GURPS.modifierRangeMHShortDesc'),
      },
      {
        moddesc: game.i18n.localize('GURPS.modifierRangeMHMedium'),
        max: 100,
        penalty: -7,
        description: game.i18n.localize('GURPS.modifierRangeMHMediumDesc'),
      },
      {
        moddesc: game.i18n.localize('GURPS.modifierRangeMHLong'),
        max: 500,
        penalty: -11,
        description: game.i18n.localize('GURPS.modifierRangeMHLongDesc'),
      },
      {
        moddesc: game.i18n.localize('GURPS.modifierRangeMHExtreme'),
        max: '500+', // Finaly entry.   We will check for "is string" to assume infinite
        penalty: -15,
        description: game.i18n.localize('GURPS.modifierRangeMHExtremeDesc'),
      },
    ]

    return monsterHunter2Ranges
  }

  static get penaltiesPerTenRanges() {
    const penaltiesPerTenRanges = []

    for (let i = 0; i < 50; i++) {
      penaltiesPerTenRanges.push({
        moddesc: game.i18n.format('GURPS.modifierRange', { range: (i + 1) * 10 }),
        max: (i + 1) * 10,
        penalty: -i,
        desc: `${(i + 1) * 10} yds`,
      })
    }

    return penaltiesPerTenRanges
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
    let currentValue = game.settings.get(GURPS.SYSTEM_NAME, Settings.SETTING_RANGE_STRATEGY)

    console.debug(currentValue)

    switch (currentValue) {
      case 'Standard': {
        this.ranges = GurpsRange.basicSetRanges
        break
      }
      case 'TenPenalties': {
        this.ranges = GurpsRange.penaltiesPerTenRanges
        break
      }

      default: {
        this.ranges = GurpsRange.monsterHunter2Ranges
        break
      }
    }

    this._buildModifiers()

    // update modifier bucket
    if (GURPS.ModifierBucket) GURPS.ModifierBucket.refresh()

    // FYI update all actors
    for (const actor of game.actors.contents) {
      if (actor.permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
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

export function setupRanges() {
  return new SizeAndSpeedRangeTable()
}
