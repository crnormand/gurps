'use strict'

export const SYSTEM_NAME = 'gurps'
export const SETTING_NAME = 'rangeStrategy'

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

export default class GURPSRange {
  constructor() {
    this.setup()
    this.ranges = basicSetRanges
    this.buildModifiers()
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
    })
  }

  buildModifiers() {
    this.modifiers = []
    this.ranges.forEach(e => {
      if (e.penalty != 0) {
        this.modifiers.push(GURPS.displayMod(e.penalty) + ' ' + e.moddesc)
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
    this.buildModifiers()

    // update modifier bucket
    ui.modifierbucket = game.GURPS.ModifierBucket
    if (typeof ui.modifierbucket !== 'undefined')
      ui.modifierbucket.refresh()

    // render all actors
    for (const actor of game.actors.entities) {
      if (actor.permission >= CONST.ENTITY_PERMISSIONS.OBSERVER)		// Return true if the current game user has observer or owner rights to an actor
        await actor.update({ ranges: this.ranges })
    }
  }
}