import { generateUniqueId, isNiceDiceEnabled, i18n, diceToFormula as diceToFormula } from '../../lib/utilities.js'

export class SlamCalculator {
  constructor(dependencies) {
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
    let attackerDice = this._getDicePlusAdds(rawDamageAttacker)

    let rawDamageTarget = (data.targetHp * data.relativeSpeed) / 100
    let targetDice = this._getDicePlusAdds(rawDamageTarget)

    let attackerRoll = Roll.create(diceToFormula(attackerDice, true))
    attackerRoll.evaluate()

    let adds = (data.isAoAStrong ? 2 : 0) + (data.shieldDB || 0)
    let attackerResult = Math.max(attackerRoll.total + adds, 1)

    let targetRoll = Roll.create(diceToFormula(targetDice, true))
    targetRoll.evaluate()
    let targetResult = Math.max(targetRoll.total, 1)

    let effects = {
      unaffected: 'GURPS.notAffected',
      targetFallsDown: 'GURPS.fallsDown',
      attackerFallsDown: 'GURPS.attackerFallsDown',
      dxCheck: 'GURPS.dxCheckOrFall',
    }
    let effect = effects.unaffected
    let affected = data.target
    if (this.targetFallsDown(attackerResult, targetResult)) {
      effect = effects.targetFallsDown
    } else if (this.targetDXCheck(attackerResult, targetResult)) {
      effect = effects.dxCheck
    } else if (this.attackerFallsDown(attackerResult, targetResult)) {
      affected = data.attacker
      effect = effects.attackerFallsDown
    }

    let text = game.i18n.format(effect, { name: affected })
    let message = `${affected} ${text}`

    let html = await renderTemplate('systems/gurps/templates/slam-results.html', {
      id: this._generateUniqueId(),
      attacker: data.attacker,
      attackerHp: data.attackerHp,
      attackerRaw: rawDamageAttacker,
      attackerDice: attackerDice,
      attackerResult: attackerResult,
      attackerExplain: this.explainDieRoll(attackerRoll, data.isAoAStrong, data.shieldDB),
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
      shieldDB: data.shieldDB,
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
  }

  targetFallsDown(attackerResult, targetResult) {
    return attackerResult >= targetResult * 2
  }

  attackerFallsDown(attackerResult, targetResult) {
    return targetResult >= attackerResult * 2
  }

  targetDXCheck(attackerResult, targetResult) {
    return attackerResult >= targetResult && !this.targetFallsDown(attackerResult, targetResult)
  }

  /**
   * Calculate the dice roll from the rawDamage value.
   *
   * @param {Number} rawDamage
   * @returns an Object literal with two attributes: dice (integer) and adds (integer)
   */
  _getDicePlusAdds(rawDamage) {
    // let bonusForAoA = isAoAStrong ? 2 : 0
    // If damage is less than 1d, ...
    if (rawDamage < 1) {
      // treat fractions up to 0.25 as 1d-3, ...
      if (rawDamage <= 0.25) return { dice: 1, adds: -3 }

      // fractions up to 0.5 as 1d-2, ...
      if (rawDamage <= 0.5) return { dice: 1, adds: -2 }

      // and any larger fraction as 1d-1.
      return { dice: 1, adds: -1 }
    }

    // Otherwise, round fractions of 0.5 or more up to a full die.
    let dice = Math.floor(rawDamage)
    if (rawDamage - dice >= 0.5) dice++

    // You can use All-Out Attack (Strong) to increase your damage!
    // you get +2 to damage – or +1 damage per die, if that would be better.
    // let adds = 0
    // if (isAoAStrong) adds = dice > 1 ? dice : 2

    return { dice: dice, adds: 0 }
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

  explainDieRoll(roll, isAoAStrong = false, shieldDB = 0) {
    let diceArray = roll.dice
    let resultsArray = diceArray.flatMap(it => it.results)
    let results = resultsArray.map(it => it.result)

    let explanation =
      roll.terms.length > 1 ? `${i18n('GURPS.rolled')} (${results})` : `${i18n('GURPS.rolled')} ${results}`
    if (roll.terms[2] !== '0') explanation += ` ${roll.terms[1]} ${roll.terms[2]}`

    if (!!isAoAStrong) explanation += ` + 2 (${i18n('GURPS.slamAOAStrong')})`
    if (!!shieldDB) explanation += ` + ${shieldDB} (${i18n('GURPS.slamShieldDB')})`
    return explanation
  }
}
