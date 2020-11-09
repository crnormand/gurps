'use strict'

export const SYSTEM_NAME = 'gurps'
export const SETTING_NAME = 'rangeStrategy'

const BasicRangeSpeedMods =
  `[-1 Range 3 yds]
[-2 Range 5 yds]
[-3 Range 7 yds]
[-4 Range 10 yds]
[-5 Range 15 yds]
[-6 Range 20 yds]
[-7 Range 30 yds]
[-8 Range 50 yds]
[-9 Range 70 yds]`;

const MonsterHunterSpeedRangeMods =
  `[-3 20 yds, Short range]
[-7 100 yds, Medium range]
[-11 500 yds, Long range]
[-15 500+ yds, Extreme range]`;

// Must be kept in order... checking range vs Max.   If >Max, go to next entry.
/* Example code:
        for (let range of game.GURPS.ranges) {
          if (yards <= range.max)
            return range.penalty;
        }
*/
const monsterHunter2Ranges = [
  {
    moddesc: "for Close range",
    max: 5,
    penalty: 0,
    description: "Can touch or strike foe"
  },
  {
    moddesc: "for Short range",
    max: 20,
    penalty: -3,
    description: "Can talk to foe; pistol or muscle-powered missile range"
  },
  {
    moddesc: "for Medium range",
    max: 100,
    penalty: -7,
    description: "Can only shout to foe; shotgun or SMG range"
  },
  {
    moddesc: "for Long range",
    max: 500,
    penalty: -11,
    description: "Opponent out of earshot; rifle range"
  },
  {
    moddesc: "for Extreme range",
    max: "500+",				// Finaly entry.   Could be null, but would require extra check... so just make it LARGE
    penalty: -15,
    desc: "Rival difficult to even see; sniper range"
  }
];

// Must be kept in order... checking range vs Max.   If >Max, go to next entry.
const basicSetRanges = [];

// Yes, I should be able to do this programatically... but my brain hurts right now, so there.
let r = [
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
  "300+", -14];

for (let i = 0; i < r.length; i = i + 2) {
  let d = {
    moddesc: `for range/speed ${r[i]} yds`,
    max: r[i],
    penalty: r[i + 1],
    desc: `${r[i]} yds`
  };
  basicSetRanges.push(d);
}

export class GURPSRange {
  constructor() {
    this.setup()
    this.modifiers = BasicRangeSpeedMods
    this.ranges = basicSetRanges
  }

  setup() {
    let self = this

    Hooks.once("init", async function () {
      game.GURPS = GURPS;

      /* Define Settings */
      game.settings.register(SYSTEM_NAME, SETTING_NAME, {
        name: 'Default Range modifier strategy',
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

    Hooks.once("ready", async function () {
      self.update()
    })
  }

  async update() {
    let currentValue = game.settings.get(SYSTEM_NAME, SETTING_NAME)
    console.log(currentValue)

    if (currentValue === 'Standard') {
      this.modifiers = BasicRangeSpeedMods
      this.ranges = basicSetRanges
    }
    else {
      this.modifiers = MonsterHunterSpeedRangeMods
      this.ranges = monsterHunter2Ranges
    }

    // update modifier bucket
    ui.modifierbucket = game.GURPS.ModifierBucket;
    if (typeof ui.modifierbucket !== 'undefined')
      ui.modifierbucket.render(true);

    // render all actors
    for (const actor of game.actors.entities) {
      await actor.update({ ranges: this.ranges })
    }
  }
}