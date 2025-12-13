import { diceToFormula } from '../../lib/utilities.js'
import { addDice, getDiceData, getDicePlusAdds } from '../utilities/damage-utils.js'

const effects = {
  unaffected: {
    localizationKey: 'GURPS.notAffected',
    createButton(label) {
      return label
    },
  },
  fallsDown: {
    localizationKey: 'GURPS.fallsDownApplyProne',
    createButton(label, data) {
      return data.isRealTarget ? `["${label}" /st + prone :${data.token.id}]` : label
    },
  },
  dxCheck: {
    localizationKey: 'GURPS.dxCheckOrFallApplyProne',
    createButton(label, data) {
      return data.isRealTarget
        ? `["${label}" /sel ${data.token.id} \\\\ /if ! [DX] /st + prone]`
        : label.replace('DX', '[DX]')
    },
  },
}

export class SlamCalculator {
  constructor(dependencies) {
    this._generateUniqueId = dependencies?.generateUniqueId
    this._ssrt = dependencies?.sizeAndSpeedRangeTable
    this._isDiceSoNiceEnabled = dependencies?.isNiceDiceEnabled
    this._roll = dependencies?.roll
    this.localize = dependencies?.localize
    this.format = dependencies?.format
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
    const slam = this._getSlamData(data)

    let attackerRoll = this._roll.create(diceToFormula(slam.attackerDice, `[Slam Attacker's roll]`, true))
    await attackerRoll.evaluate()

    let attackerMin = false
    let attackerResult = attackerRoll.total + slam.attackerAdds
    if (attackerResult < 1) {
      attackerResult = 1
      attackerMin = true
    }

    let targetRoll = this._roll.create(diceToFormula(slam.targetDice, `[Slam Defender's roll]`, true))
    await targetRoll.evaluate()
    let targetMin = false
    let targetResult = targetRoll.total + slam.targetAdds
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

    let result = this.format(resultData.effect.localizationKey, resultData)
    result = resultData.effect.createButton(result, resultData)

    let html = await foundry.applications.handlebars.renderTemplate('systems/gurps/templates/slam-results.hbs', {
      id: this._generateUniqueId(),
      attacker: data.attackerToken?.name,
      attackerHp: data.attackerHp,
      attackerRaw: slam.rawDamageAttacker,
      attackerDice: slam.attackerDice,
      attackerResult: attackerResult,
      attackerExplain: this.explainDieRoll(
        attackerRoll,
        data.isAoAStrong,
        data.shieldDB,
        slam.velocityAdd * slam.attackerDice.dice,
        attackerMin
      ),
      // ---
      target: data.targetToken.name,
      targetHp: data.targetHp,
      targetRaw: slam.rawDamageTarget,
      targetDice: slam.targetDice,
      targetResult: targetResult,
      targetExplain: this.explainDieRoll(
        targetRoll,
        false,
        -data.shieldDB,
        slam.velocityAdd * slam.targetDice.dice,
        targetMin
      ),
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
      content: html,
      roll: JSON.stringify(attackerRoll),
      sound: this.rollThemBones([targetRoll]),
    }

    await ChatMessage.create(messageData)
    let targets = []
    game.user.targets.forEach(t => targets.push(t))
    game.user.targets.clear()
    await GURPS.executeOTF(`/r [${attackerResult} cr @${data.targetToken.name} "slam damage"]`)
    GURPS.LastActor = data.targetToken.actor
    await GURPS.executeOTF(`/r [${targetResult} cr @${data.attackerToken.name} "slam damage"]`)
    GURPS.LastActor = data.attackerToken.actor
    targets.forEach(t => game.user.targets.add(t))
  }

  _getSlamData(data) {
    let attackerAdds = (data.isAoAStrong ? 2 : 0) + (data.shieldDB || 0)
    let attackerDice, targetDice
    let targetAdds = 0
    let rawDamageAttacker, rawDamageTarget
    let velocityAdd = 0

    if (data.useDFRPGRules) {
      targetAdds = -data.shieldDB || 0
      attackerDice = getDiceData(addDice(data.attackerThr, -2))
      targetDice = getDiceData(addDice(data.targetThr, -2))
      velocityAdd = 0 // combined speed 1
      if (data.relativeSpeed >= 2) velocityAdd = -this._ssrt.getModifier(data.relativeSpeed) // convert range mod to size mod
      attackerAdds += velocityAdd * attackerDice.dice
      targetAdds += velocityAdd * targetDice.dice
    } else {
      // If you hit, you and your foe each inflict dice of
      // crushing damage on the other equal to (HP x velocity)/100.
      rawDamageAttacker = (data.attackerHp * data.relativeSpeed) / 100
      attackerDice = getDicePlusAdds(rawDamageAttacker)

      rawDamageTarget = (data.targetHp * data.relativeSpeed) / 100
      targetDice = getDicePlusAdds(rawDamageTarget)
    }

    return {
      attackerDice: attackerDice,
      attackerAdds: attackerAdds,
      rawDamageAttacker: rawDamageAttacker,
      targetDice: targetDice,
      targetAdds: targetAdds,
      rawDamageTarget: rawDamageTarget,
      velocityAdd: velocityAdd,
    }
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
   *
   * @param {Aray<Roll>} rollArray
   */
  rollThemBones(rollArray) {
    if (!this._isDiceSoNiceEnabled()) return CONFIG?.sounds.dice

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
      game?.dice3d.show({ throws: [{ dice: dice }] })
    }
  }

  explainDieRoll(roll, isAoAStrong = false, shieldDB = 0, velocity = 0, min = false) {
    let diceArray = roll.dice
    let resultsArray = diceArray.flatMap(it => it.results)
    let results = resultsArray.map(it => it.result)

    let explanation =
      roll.terms.length > 1
        ? `${this.localize('GURPS.rolled')} (${results})`
        : `${this.localize('GURPS.rolled')} ${results}`
    if (roll.terms[2]?.number !== '0') explanation += `${roll.terms[1].formula}${roll.terms[2].formula}`

    if (!!isAoAStrong) explanation += ` + 2 (${this.localize('GURPS.slamAOAStrong')})`
    let sign = shieldDB >= 0 ? '+' : '-'
    if (!!shieldDB) explanation += ` ${sign} ${Math.abs(shieldDB)} (${this.localize('GURPS.slamShieldDB')})`
    if (!!velocity) explanation += ` + ${velocity} ${this.localize('GURPS.slamRelativeVelocity')}`
    if (min) explanation += ` (${this.localize('GURPS.minimum')} 1)`
    return explanation
  }
}
