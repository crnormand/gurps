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

    let attackerAdds = (data.isAoAStrong ? 2 : 0) + (data.shieldDB || 0)
    let targetAdds = -(data.shieldDB || 0)

    let velocityAdd = 0

    if (data.useDFRPGRules) {
      let thr = data.attackerThr
      let diceMatch = thr.match(/(\d+)d(.*)/i)
      if (!diceMatch) {
        ui.notifications.warn('Attacker Thrust damage (' + thr + ") does not include 'd'")
        return
      }
      attackerDice = { dice: +diceMatch[1], adds: +diceMatch[2] || 0 }
      thr = data.targetThr
      diceMatch = thr.match(/(\d+)d(.*)/i)
      if (!diceMatch) {
        ui.notifications.warn('Target Thrust damage (' + thr + ") does not include 'd'")
        return
      }
      targetDice = { dice: +diceMatch[1], adds: +diceMatch[2] || 0 }
      velocityAdd = -2 // combined speed 1
      if (data.relativeSpeed >= 2) velocityAdd = -GURPS.SSRT.getModifier(data.relativeSpeed) // convert range mod to size mod
      attackerAdds += velocityAdd * attackerDice.dice
      targetAdds += velocityAdd * targetDice.dice
    }

    let attackerRoll = Roll.create(diceToFormula(attackerDice, `[Slam Attacker's roll]`, true))
    await attackerRoll.evaluate()

    let attackerMin = false
    let attackerResult = attackerRoll.total + attackerAdds
    if (attackerResult < 1) {
      attackerResult = 1
      attackerMin = true
    }

    let targetRoll = Roll.create(diceToFormula(targetDice, `[Slam Defender's roll]`, true))
    await targetRoll.evaluate()
    let targetMin = false
    let targetResult = targetRoll.total + targetAdds
    if (targetResult < 1) {
      targetResult = 1
      targetMin = true
    }

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
      attackerExplain: this.explainDieRoll(
        attackerRoll,
        data.isAoAStrong,
        data.shieldDB,
        velocityAdd * attackerDice.dice,
        attackerMin
      ),
      // ---
      target: data.targetToken.name,
      targetHp: data.targetHp,
      targetRaw: rawDamageTarget,
      targetDice: targetDice,
      targetResult: targetResult,
      targetExplain: this.explainDieRoll(targetRoll, false, -data.shieldDB, velocityAdd * targetDice.dice, targetMin),
      // ---
      effect: resultData.effect,
      isAoAStrong: data.isAoAStrong,
      relativeSpeed: data.relativeSpeed,
      result: result,
      shieldDB: data.shieldDB,
      useDFRPGRules: data.useDFRPGRules,
    })

    // const speaker = { alias: attacker.name, _id: attacker._id, actor: attacker }
    let messageData = {
      user: game.user.id,
      // speaker: speaker,
      content: html,
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      roll: JSON.stringify(attackerRoll),
      sound: this.rollThemBones([targetRoll]),
    }

    ChatMessage.create(messageData).then(async () => {
      let targets = []
      game.user.targets.forEach(t => targets.push(t))
      game.user.targets.clear()
      await GURPS.executeOTF(`/r [${attackerResult} cr @${data.targetToken.name}]`)
      GURPS.LastActor = data.targetToken.actor
      await GURPS.executeOTF(`/r [${targetResult} cr @${data.attackerToken.name}]`)
      GURPS.LastActor = data.attackerToken.actor
      targets.forEach(t => game.user.targets.add(t))
    })
  }

  targetFallsDown(attackerResult, targetResult) {
    return attackerResult >= targetResult * 2
  }

  attackerFallsDown(attackerResult, targetResult) {
    return targetResult >= attackerResult * 2
  }

  targetDXCheck(attackerResult, targetResult) {
    return attackerResult > targetResult && !this.targetFallsDown(attackerResult, targetResult)
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

  explainDieRoll(roll, isAoAStrong = false, shieldDB = 0, velocity = 0, min = false) {
    let diceArray = roll.dice
    let resultsArray = diceArray.flatMap(it => it.results)
    let results = resultsArray.map(it => it.result)

    let explanation =
      roll.terms.length > 1 ? `${i18n('GURPS.rolled')} (${results})` : `${i18n('GURPS.rolled')} ${results}`
    if (roll.terms[2]?.number !== '0') explanation += `${roll.terms[1].formula}${roll.terms[2].formula}`

    if (!!isAoAStrong) explanation += ` + 2 (${i18n('GURPS.slamAOAStrong')})`
    let sign = shieldDB >= 0 ? '+' : '-'
    if (!!shieldDB) explanation += ` ${sign} ${Math.abs(shieldDB)} (${i18n('GURPS.slamShieldDB')})`
    if (!!velocity) explanation += ` + ${velocity} ${i18n('GURPS.slamRelativeVelocity')}`
    if (min) explanation += ` (${i18n('GURPS.minimum')} 1)`
    return explanation
  }
}
