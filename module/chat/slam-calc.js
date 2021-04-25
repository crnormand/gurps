import { generateUniqueId, isNiceDiceEnabled } from '../../lib/utilities.js'

export class SlamCalculator {
  constructor(dependencies = {}) {
    if (!!dependencies) {
      this._generateUniqueId = dependencies.generateUniqueId
    } else {
      this._generateUniqueId = generateUniqueId
    }
  }

  async process(data) {
    // If you hit, you and your foe each inflict dice of
    // crushing damage on the other equal to (HP x velocity)/100.
    let rawDamageAttacker = (data.attackerHp * data.relativeSpeed) / 100
    let attackerDice = this._getDicePlusAdds(rawDamageAttacker, data.isAoAStrong)

    let rawDamageTarget = (data.targetHp * data.relativeSpeed) / 100
    let targetDice = this._getDicePlusAdds(rawDamageTarget)

    let attackerRoll = Roll.create(`${attackerDice.dice}d6! + ${attackerDice.adds}`)
    attackerRoll.evaluate()
    let attackerResult = Math.max(attackerRoll.total, 1)

    let targetRoll = Roll.create(`${targetDice.dice}d6! + ${targetDice.adds}`)
    targetRoll.evaluate()
    let targetResult = Math.max(targetRoll.total, 1)

    let effects = {
      unaffected: 'GURPS.notAffected',
      fallsDown: 'GURPS.fallsDown',
      dxCheck: 'GURPS.dxCheckOrFall',
    }
    let effect = effects.unaffected
    let affected = data.target
    if (attackerResult >= targetResult * 2) {
      effect = effects.fallsDown
    } else if (attackerResult >= targetResult) {
      effect = effects.dxCheck
    } else if (targetResult >= attackerResult * 2) {
      affected = data.attacker
      effect = effects.fallsDown
    }

    let message = `${affected} ${game.i18n.localize(effect)}`

    let html = await renderTemplate('systems/gurps/templates/slam-results.html', {
      id: this._generateUniqueId(),
      attacker: data.attacker,
      attackerHp: data.attackerHp,
      attackerRaw: rawDamageAttacker,
      attackerDice: attackerDice,
      attackerResult: attackerResult,
      attackerExplain: this.explainDieRoll(attackerRoll),
      // ---
      target: data.target,
      targetHp: data.targetHp,
      targetRaw: rawDamageTarget,
      targetDice: targetDice,
      targetResult: targetResult,
      targetExplain: this.explainDieRoll(targetRoll),
      // ---
      effect: effect,
      isAoAStrong: data.isAoAStrong,
      relativeSpeed: data.relativeSpeed,
      result: message,
    })

    // const speaker = { alias: attacker.name, _id: attacker._id, actor: attacker }
    let messageData = {
      user: game.user._id,
      // speaker: speaker,
      content: html,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: attackerRoll,
      sound: this.rollThemBones([targetRoll]),
    }

    ChatMessage.create(messageData)

    // Chat message:
    // Slam Attack
    // Attacker _____ slams [target|____].
    //   [Target|____] must roll [DX or fall down].
    // OR
    //   [Target|____] falls down! (set condition 'Prone')
    // OR
    //   [Target|____] is not affected.
    // OR [Attacker] falls down! (set condition 'Prone')
    // SHOW THE MATH
    // Bjorn:
    //   HP (17) x Speed (8) / 100 = 1.36
    //   Dice: 1d -> Roll: 4
    // Zombie:
    //   HP: (11)  Speed: (8) / 100 = 0.88
    //   Dice: 1d-1 -> Roll: 2
    //
    // attackerDice = Roll.create('1d6-1!')
    console.log(
      `Slam Attack
  ${data.attacker} slams ${data.target}.
  ---
  Relative Speed: ${data.relativeSpeed}
  ${data.attacker}:
    HP (${data.attackerHp}) x Speed (${data.relativeSpeed}) / 100 = ${rawDamageAttacker}
    Dice: ${attackerDice.dice}d${attackerDice.adds >= 0 ? '+' : ''}${attackerDice.adds}

  ${data.target}:
    HP (${data.targetHp}) x Speed (${data.relativeSpeed}) / 100 = ${rawDamageTarget}
    Dice: ${targetDice.dice}d${targetDice.adds >= 0 ? '+' : ''}${targetDice.adds}
`
    )
  }

  /**
   * Calculate the dice roll from the rawDamage value.
   *
   * @param {Number} rawDamage
   * @param {Boolean} isAoAStrong
   * @returns an Object literal with two attributes: dice (integer) and adds (integer)
   */
  _getDicePlusAdds(rawDamage, isAoAStrong = false) {
    let bonusForAoA = isAoAStrong ? 2 : 0
    // If damage is less than 1d, ...
    if (rawDamage < 1) {
      // treat fractions up to 0.25 as 1d-3, ...
      if (rawDamage <= 0.25) return { dice: 1, adds: -3 + bonusForAoA }

      // fractions up to 0.5 as 1d-2, ...
      if (rawDamage <= 0.5) return { dice: 1, adds: -2 + bonusForAoA }

      // and any larger fraction as 1d-1.
      return { dice: 1, adds: -1 + bonusForAoA }
    }

    // Otherwise, round fractions of 0.5 or more up to a full die.
    let dice = Math.floor(rawDamage)
    if (rawDamage - dice >= 0.5) dice++

    // You can use All-Out Attack (Strong) to increase your damage!
    // you get +2 to damage – or +1 damage per die, if that would be better.
    let adds = 0
    if (isAoAStrong) adds = dice > 1 ? dice : 2

    return { dice: dice, adds: adds }
  }

  /**
   *
   * @param {Aray<Roll>} rollArray
   */
  rollThemBones(rollArray) {
    if (!isNiceDiceEnabled()) return CONFIG.sounds.dice

    if (!Array.isArray(rollArray)) {
      rollArray = [rollArray]
    }

    let dice = []
    rollArray.forEach(r => {
      r.dice.forEach(d => {
        let type = 'd' + d.faces
        d.results.forEach(s =>
          dice.push({
            result: s.result,
            resultLabel: s.result,
            type: type,
            vectors: [],
            options: {},
          })
        )
      })
    })

    if (dice.length > 0) {
      game.dice3d.show({ throws: [{ dice: dice }] })
    }
  }

  explainDieRoll(roll) {
    let diceArray = roll.dice
    let resultsArray = diceArray.flatMap(it => it.results)
    let results = resultsArray.map(it => it.result)

    return roll.terms.length > 1 ? `Rolled (${results}) ${roll.terms[1]} ${roll.terms[2]}` : `Rolled ${results}`
  }
}
