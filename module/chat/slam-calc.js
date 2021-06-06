import {
  generateUniqueId,
  isNiceDiceEnabled,
  i18n,
  i18n_f,
  diceToFormula as diceToFormula,
} from '../../lib/utilities.js'

const effects = {
  unaffected: {
    i18n: 'GURPS.notAffected',
    createButton(label) {
      return label
    },
  },
  fallsDown: {
    i18n: 'GURPS.fallsDownApplyProne',
    createButton(label, data) {
      return data.isRealTarget ? `["${label}" /st + prone :${data.token.id}]` : label
    },
  },
  dxCheck: {
    i18n: 'GURPS.dxCheckOrFallApplyProne',
    createButton(label, data) {
      return data.isRealTarget
        ? `["${label}" /sel ${data.token.id} \\\\ /if ! [DX] /st + prone]`
        : label.replace('DX', '[DX]')
    },
  },
}

export class SlamCalculator {
  constructor(dependencies) {
    if (!!dependencies) {
      this._generateUniqueId = dependencies.generateUniqueId
    } else {
      this._generateUniqueId = generateUniqueId
    }
  }

  /*
    data = {
    attackerToken: {Token},
    targetToken: {Token},
    isRealTarget: {Boolean} - true if target is a selected token
    attackerHp: {Number}
    attackerSpeed: {Number},
    targetHp: {Number},
    targetSpeed: {Number},
    relativeSpeed: {Number} - targetSpeed + attackerSpeed,
    isAoAStrong: {Boolean},
    shieldDB: {Number},
  */
  async process(data) {
    // If you hit, you and your foe each inflict dice of
    // crushing damage on the other equal to (HP x velocity)/100.
    let rawDamageAttacker = (data.attackerHp * data.relativeSpeed) / 100
    let attackerDice = this._getDicePlusAdds(rawDamageAttacker)

    let rawDamageTarget = (data.targetHp * data.relativeSpeed) / 100
    let targetDice = this._getDicePlusAdds(rawDamageTarget)

    let attackerRoll = Roll.create(diceToFormula(attackerDice, true))
    attackerRoll.evaluate({ async: false })

    let adds = (data.isAoAStrong ? 2 : 0) + (data.shieldDB || 0)
    let attackerResult = Math.max(attackerRoll.total + adds, 1)

    let targetRoll = Roll.create(diceToFormula(targetDice, true))
    targetRoll.evaluate({ async: false })
    let targetResult = Math.max(targetRoll.total, 1)

    let resultData = {
      effect: effects.unaffected,
      token: data.targetToken,
      isRealTarget: data.isRealTarget,
      get name() {
        return this.token.name
      },
      get id() {
        return this.token.id
      },
    }

    if (this.targetFallsDown(attackerResult, targetResult)) {
      resultData.effect = effects.fallsDown
    } else if (this.targetDXCheck(attackerResult, targetResult)) {
      resultData.effect = effects.dxCheck
    } else if (this.attackerFallsDown(attackerResult, targetResult)) {
      resultData.token = data.attackerToken
      resultData.effect = effects.fallsDown
      resultData.isRealTarget = true
    }

    let result = i18n_f(resultData.effect.i18n, resultData)
    result = resultData.effect.createButton(result, resultData)

    let html = await renderTemplate('systems/gurps/templates/slam-results.html', {
      id: this._generateUniqueId(),
      attacker: data.attackerToken?.name,
      attackerHp: data.attackerHp,
      attackerRaw: rawDamageAttacker,
      attackerDice: attackerDice,
      attackerResult: attackerResult,
      attackerExplain: this.explainDieRoll(attackerRoll, data.isAoAStrong, data.shieldDB),
      // ---
      target: data.targetToken.name,
      targetHp: data.targetHp,
      targetRaw: rawDamageTarget,
      targetDice: targetDice,
      targetResult: targetResult,
      targetExplain: this.explainDieRoll(targetRoll),
      // ---
      effect: resultData.effect,
      isAoAStrong: data.isAoAStrong,
      relativeSpeed: data.relativeSpeed,
      result: result,
      shieldDB: data.shieldDB,
    })

    // const speaker = { alias: attacker.name, _id: attacker._id, actor: attacker }
    let messageData = {
      user: game.user.id,
      // speaker: speaker,
      content: html,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll: JSON.stringify(attackerRoll),
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
