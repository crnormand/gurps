import { MeleeAttackModel } from '@module/action/index.js'
import { RangedAttackModel } from '@module/action/ranged-attack.js'
import { Damage } from '@module/damage/index.js'
import { addBucketToDamage, doRoll } from '@module/dierolls/dieroll.js'
import { GurpsItemV2 } from '@module/item/gurps-item.js'
import { ItemType } from '@module/item/types.js'
import { parseForRollOrDamage } from '@module/otf/parselink.js'
import { OtfAction, OtfActionType, SkillSpellRollAction, CalcOnlyAction, AttackAction } from '@module/otf/types.js'
import { GetNumberInput } from '@module/ui/get-number-input.js'
import * as Settings from '@module/util/miscellaneous-settings.js'
import { getTokenForActor } from '@module/util/token.js'
import { MissileWeaponAttacks } from '@rules/combat/ranged/missile-weapon-attacks.js'
import { d6ify, quotedAttackName, stripBracketContents } from '@util/utilities.js'

export interface ActionFuncContext {
  shiftKey: boolean
  ctrlKey: boolean
  data?: any
}

export interface actionFuncParams {
  action: OtfAction | (OtfAction & CalcOnlyAction)
  actor: Actor.Implementation | null
  event: ActionFuncContext | null //toDo: this can have several custom attributes. Change to an custom interface
  targets?: string[]
  originalOtf?: string
  calcOnly?: boolean
}

export type actionFunc = (param: actionFuncParams) => Promise<boolean> | { target: number; thing?: string } | boolean

export const actionFuncs: Record<string, actionFunc> = {
  /**
   * @param {Object} data
   * @param {Object} data.actor
   * @param {Object} data.action
   * @param {string} data.action.link
   */
  pdf({ action, calcOnly }: actionFuncParams) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.pdf) return false

    if (!action.link) {
      ui.notifications?.warn('no link was parsed for the pdf')

      return false // if there's no link action fails
    }

    GURPS.modules.Pdf.handlePdf(action.link)

    return true
  },

  //
  iftest({ action, calcOnly }: actionFuncParams) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.ifTest) return false

    if (!GURPS.lastTargetedRoll) return false
    if (action.name == 'isCritSuccess') return GURPS.lastTargetedRoll.isCritSuccess
    if (action.name == 'isCritFailure') return GURPS.lastTargetedRoll.isCritFailure

    if (!action.equation)
      // if [@margin] tests for >=0
      return GURPS.lastTargetedRoll.margin >= 0
    else {
      const match = action.equation?.match(/ *([=<>]+) *([+-]?[\d.]+)/)

      if (!Array.isArray(match) || match.length < 3) {
        ui.notifications?.warn('equation for if test could not be parsed')

        return false
      }

      const value = Number(match[2])

      switch (match[1]) {
        case '=':
        case '==':
          return GURPS.lastTargetedRoll.margin == value
        case '>':
          return GURPS.lastTargetedRoll.margin > value
        case '>=':
          return GURPS.lastTargetedRoll.margin >= value
        case '<':
          return GURPS.lastTargetedRoll.margin < value
        case '<=':
          return GURPS.lastTargetedRoll.margin <= value
        default:
          return false
      }
    }
  },

  modifier({ action, calcOnly }: actionFuncParams) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.modifier) return false

    if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc ?? '')

    if (action.next && action.next.type === OtfActionType.modifier) {
      return this.modifier({ action: action.next, actor: null, event: null }) // recursion, but you need to wrap the next action in an object using the 'action' attribute
    }

    return true
  },

  async chat({ action, actor, event, calcOnly }: actionFuncParams) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.chat) return false
    if (!event) return false
    // @ts-expect-error - Foundry VTT API not fully typed
    const ctrlKey = game.keyboard.isModifierActive(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL)
    const chat = `/setEventFlags ${!!action.quiet} ${!!event.shiftKey} ${ctrlKey}\n${action.orig}`

    if (action.overridetxt) {
      if (!event?.data) event.data = {}
      event.data.overridetxt = action.overridetxt
    }

    const savedActor = GURPS.LastActor

    if (actor) GURPS.SetLastActor(actor) // try to ensure the correct last actor.
    // @ts-expect-error - custom chatmsgData property added to MouseEvent
    const ret = await GURPS.ChatProcessors.startProcessingLines(chat, event?.chatmsgData, event)

    if (savedActor) GURPS.SetLastActor(savedActor)

    return ret
  },

  dragdrop({ action, calcOnly }: actionFuncParams) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.dragDrop) return false

    if (!action.id) {
      ui.notifications?.warn(`no id in drag and drop action`)

      return false
    }

    switch (action.link) {
      case 'JournalEntry': {
        const journalEntry = game.journal?.get(action.id)

        if (journalEntry) journalEntry.sheet?.render(true)

        return true
      }
      case 'JournalEntryPage':
        foundry.documents.collections.Journal._showEntry(action.id)

        return true
      case 'Actor':
        game.actors?.get(action.id)?.sheet?.render(true)

        return true
      case 'RollTable':
        game.tables?.get(action.id)?.sheet?.render(true)

        return true
      case 'Item':
        game.items?.get(action.id)?.sheet?.render(true)

        return true
      default:
        ui.notifications?.warn(`unknown entity type: ${action.link}`)

        return false
    }
  },

  damage({ action, event, actor, targets, calcOnly }: actionFuncParams) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.damage) return false

    // accumulate action fails if there's no selected actor
    if (action.accumulate && !actor) {
      ui.notifications?.warn(game.i18n?.localize('GURPS.chatYouMustHaveACharacterSelected') ?? '')

      return false
    }

    return (async () => {
      let canRoll = { canRoll: true, targetMessage: '' }
      const token = getTokenForActor(actor) ?? null

      if (actor) canRoll = (await actor.canRoll(action, token)) as { canRoll: true; targetMessage: '' }

      if (!canRoll.canRoll) {
        if (canRoll.targetMessage) {
          ui.notifications?.warn(canRoll.targetMessage)

          return false
        }
      }

      if (action.accumulate && actor) {
        // store/increment value on GurpsActorV2
        await actor.accumulateDamageRoll(action)

        return true
      }

      if (action.costs) GURPS.ModifierBucket.addModifier('0', action.costs)

      if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc ?? '') // special case where Damage comes from [D:attack + mod]

      const taggedSettings = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
      let displayFormula = action.formula ?? ''

      if (actor && taggedSettings?.autoAdd) {
        await actor.addTaggedRollModifiers('', { action }, action.att )
        displayFormula = addBucketToDamage(displayFormula, false)
      }

      return await Damage.rollDamage(
        canRoll,
        token,
        actor ?? null,
        displayFormula,
        action.formula ?? '',
        action,
        event ?? null,
        null,
        targets ?? []
      )
    })()
  },

  deriveddamage({ action, event, actor, targets, calcOnly }: actionFuncParams) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.derivedDamage) return false

    // action fails if there's no selected actor
    if (!actor) {
      ui.notifications?.warn(game.i18n?.localize('GURPS.chatYouMustHaveACharacterSelected') ?? '')

      return false
    }

    return (async () => {
      const df = action.derivedformula.match(/sw/i) ? actor.system.swing : actor.system.thrust

      // action fails if there's no formula
      if (!df) {
        ui.notifications?.warn(`${actor.name} does not have a ${action.derivedformula.toUpperCase()} formula`)

        return false
      }

      // Here we need to check if both formula and df contains +add (like +1)
      // If so, we need to sum the adds
      const dice = df.match(/(\d+d).*/)?.[1]
      const dfAdd = df.match(/([+-]\d+).*/)?.[1]
      const formulaAdd = action.formula.match(/([+-]\d+).*/)?.[1]
      // Need to find everything else in action.formula which is not the formulaAdd. Example +2x3 -> x3
      const formulaOther = action.formula.replace(/([+-]\d+).*/g, '')
      let finalAdd
      let formula

      if (dfAdd && formulaAdd) {
        finalAdd = parseInt(dfAdd) + parseInt(formulaAdd)
        const signal = finalAdd === 0 ? '' : finalAdd > 0 ? '+' : '-'

        formula = `${dice}${signal}${finalAdd !== 0 ? Math.abs(finalAdd) : ''}${formulaOther}`
      } else {
        formula = df + action.formula
      }

      if (action.costs) GURPS.ModifierBucket.addModifier('0', action.costs)

      if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc ?? '') // special case where Damage comes from [D:attack + mod]

      const taggedSettings = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
      let displayFormula = formula

      if (actor && taggedSettings?.autoAdd) {
        await actor.addTaggedRollModifiers('', { action }, action.att)
        displayFormula = addBucketToDamage(displayFormula, false)
      }

      let canRoll = { canRoll: true, targetMessage: '' }
      const token = getTokenForActor(actor) ?? null

      if (actor) canRoll = (await actor.canRoll(action, token)) as { canRoll: true; targetMessage: '' }

      if (!canRoll.canRoll) {
        if (canRoll.targetMessage) {
          ui.notifications?.warn(canRoll.targetMessage)

          return false
        }
      }

      const overrideText = action.derivedformula + action.formula.replace(/([+-]\d+).*/g, '$1')

      await Damage.rollDamage(
        canRoll,
        token,
        actor,
        displayFormula,
        formula,
        action,
        event ?? null,
        overrideText,
        targets ?? []
      )

      if (action.next) {
        return GURPS.performAction(action.next, actor, event, targets)
      }

      return true
    })()
  },

  attackdamage({ action, event, actor, targets, calcOnly }: actionFuncParams) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.attackDamage) return false

    // action fails if there's no selected actor
    if (!actor) {
      ui.notifications?.warn(game.i18n?.localize('GURPS.chatYouMustHaveACharacterSelected') ?? '')

      return false
    }

    if (!action.name) {
      ui.notifications?.warn('attack damage action has no name')

      return false
    }

    const att = GURPS.findAttack(actor, action.name, !!action.isMelee, !!action.isRanged) // find attack possibly using wildcards

    if (!att) {
      ui.notifications?.warn(
        `No melee or ranged attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`
      )

      return false
    }

    //toDo: verity that is not needed. Can't currently return a string here.
    //if (action.calcOnly) return [att.damage].join(', ')

    const dam = parseForRollOrDamage(att.damage)

    if (!dam) {
      ui.notifications?.warn('Damage is not rollable')

      return false
    }

    dam.action.costs = action.costs
    dam.action.mod = action.mod
    dam.action.desc = action.desc
    dam.action.att = att
    dam.action.blindroll = action.blindroll

    return GURPS.performAction(dam.action, actor, event, targets)
  },

  roll({ action, actor, event, calcOnly }: actionFuncParams) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.roll) return false
    let canRoll = true

    if (actor) {
      if (actor instanceof User) {
        canRoll = true
      } else {
        const token = actor.getActiveTokens()[0]

        actor.canRoll(action, token).then(rollPermission => (canRoll = rollPermission.canRoll))
      }
    }

    if (!canRoll) return false

    const prefix = game.i18n?.format('GURPS.chatRolling', {
      dice: action.displayformula ? action.displayformula : action.formula,
      desc: action.desc ? ' ' + action.desc : '',
    })

    if (action.costs) GURPS.ModifierBucket.addModifier('0', action.costs)

    return doRoll({
      actor,
      formula: action.formula,
      prefix,
      optionalArgs: { blind: action.blindroll, event },
    })
      .then(result => {
        return !!result
      })
      .catch(error => {
        console.error('Error during doRoll:', error)

        return false
      })
  },

  controlroll({ action, actor, event, calcOnly }: actionFuncParams) {
    if (action.type !== OtfActionType.controlRoll) return calcOnly ? { target: 0 } : false
    if (calcOnly) return { target: action.target }
    const target = action.target
    const aid = actor ? `@${actor.id}@` : ''
    let thing
    let chatthing

    if (action.desc) {
      thing = action.desc
      chatthing = `["${game.i18n?.localize('GURPS.chatRollingCR')}, ${thing}"${aid}CR:${target} ${thing}]`
    } else {
      chatthing = `[${aid}CR:${target}]`
    }

    return doRoll({
      actor,
      thing,
      chatthing,
      origtarget: target,
      optionalArgs: { blind: action.blindroll, event },
      // @ts-expect-error -doRoll not properly typed yet. ToDo: refactor later
      action,
    })
      .then(result => {
        return !!result
      })
      .catch(error => {
        console.error('Error during doRoll:', error)

        return false
      })
  },

  derivedroll({ action, actor, event, calcOnly }: actionFuncParams) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.derivedRoll) return false

    if (!action.derivedformula) {
      ui.notifications?.warn('derived roll with no derived formula')

      return calcOnly ? { target: 0 } : false
    }

    if (!actor) {
      ui.notifications?.warn(game.i18n?.localize('GURPS.chatYouMustHaveACharacterSelected') ?? '')

      return calcOnly ? { target: 0 } : false
    }

    const df = action.derivedformula.match(/[Ss][Ww]/) ? actor.system.swing : actor.system.thrust

    if (action.costs) GURPS.ModifierBucket.addModifier('0', action.costs)

    // const originalFormula = action.derivedformula + action.formula
    return doRoll({
      actor,
      formula: d6ify(df + action.formula),
      prefix: game.i18n?.format('GURPS.chatRolling', {
        dice: action.derivedformula,
        desc: action.desc ?? '',
      }),
      optionalArgs: { blind: action.blindroll, event },
    })
      .then(result => {
        return !!result
      })
      .catch(error => {
        console.error('Error during doRoll:', error)

        return false
      })
  },

  attack({ action, actor, event, calcOnly }: actionFuncParams) {
    if (action.type !== OtfActionType.attack) return calcOnly ? { target: 0 } : false

    if (!actor) {
      ui.notifications?.warn(game.i18n?.localize('GURPS.chatYouMustHaveACharacterSelected') ?? '')

      return calcOnly ? { target: 0 } : false
    }

    if (!action.name) {
      ui.notifications?.warn('attack action without name')

      return calcOnly ? { target: 0 } : false
    }

    const att = GURPS.findAttack(actor, action.name, action.isMelee, action.isRanged) // find attack possibly using wildcards

    if (!att) {
      if (('calcOnly' in action && action.calcOnly) || calcOnly) return { target: 0 }
      else {
        ui.notifications?.warn(`No melee attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)
      }

      return false
    }

    let prefix = 'A:'

    if (!!action.isMelee && !action.isRanged) prefix = 'M:'
    if (!action.isMelee && !!action.isRanged) prefix = 'R:'
    const thing = stripBracketContents(att.name ? att.name : att.item.name)
    const qn = quotedAttackName({ name: thing, mode: att.mode })
    const aid = actor ? `@${actor.id}@` : ''
    const chatthing = `[${aid}${prefix}${qn}]`
    const followon = `[${aid}D:${qn}]`
    const target = att.level

    if (!target) {
      ui.notifications?.warn(`attack named ${thing} has level of 0 or NaN`)

      return false
    }

    if (('calcOnly' in action && action.calcOnly) || calcOnly) {
      let modifier = parseInt(action.mod ?? '0') ?? 0

      if (isNaN(modifier)) modifier = 0

      return { target: target + modifier, thing: thing }
    }

    return doAttack(action, att, actor, target, thing, chatthing, followon, event)

    async function doAttack(
      action: AttackAction,
      att: MeleeAttackModel | RangedAttackModel,
      actor: Actor.Implementation,
      target: number,
      thing: string,
      chatthing: string,
      followon: string,
      event: ActionFuncContext | null
    ) {
      const opt = {
        blind: action.blindroll,
        event,
        obj: att, // save the attack in the optional parameters, in case it has rcl/rof
        followon,
        text: '',
        itemPath: 'itemPath' in action ? action.itemPath : undefined,
        shots: undefined as number | undefined,
      }

      const targetmods: Modifier[] = []

      /* @ts-expect-error - wait for fix for issue #2899*/
      if (opt.obj.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event, actor))) return false
      /* @ts-expect-error - wait for fix for issue #2899*/
      if (opt.obj.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event, actor)
      if (action.costs) GURPS.ModifierBucket.addModifier('0', action.costs, targetmods)
      if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc ?? '', targetmods)

      const parsedRateOfFire = !action.isMelee ? (att as RangedAttackModel).rateOfFire.mode1.shotsPerAttack : 0

      if (parsedRateOfFire > 1) {
        const shots = await GetNumberInput({
          title: game.i18n?.localize('GURPS.combat.rof.numberOfShotsTitle') ?? '',
          headerText: action.orig,
          promptText: game.i18n?.localize('GURPS.combat.rof.numberOfShotsPrompt') ?? '',
          label: game.i18n?.format('GURPS.combat.rof.numberOfShotsLabel', { max: `${parsedRateOfFire}` }) ?? '',
          min: 1,
          max: parsedRateOfFire,
          value: parsedRateOfFire,
        })

        const bonusForNumberOfShots = MissileWeaponAttacks.calculateRoFModifier(shots)

        if (bonusForNumberOfShots !== 0)
          GURPS.ModifierBucket.addModifier(
            `${bonusForNumberOfShots}`,
            game.i18n?.format('GURPS.combat.rof.bonusLabel', { shots: `${shots}` }) ?? '',
            targetmods
          )
        opt.shots = shots
      }

      if (action.overridetxt) opt.text += "<span style='font-size:85%'>" + action.overridetxt + '</span>'

      return !!(await doRoll({
        actor,
        // @ts-expect-error -doRoll not properly typed yet. ToDo: refactor later
        targetmods,
        thing,
        chatthing,
        origtarget: target,
        optionalArgs: opt,
        // @ts-expect-error -doRoll not properly typed yet. ToDo: refactor later
        action,
      }))
    }
  },

  ['weapon-block']({ action, actor, event, calcOnly }: actionFuncParams) {
    if (action.type !== OtfActionType.weaponBlock) return calcOnly ? { target: 0 } : false

    if (!actor) {
      ui.notifications?.warn(game.i18n?.localize('GURPS.chatYouMustHaveACharacterSelected') ?? '')

      return calcOnly ? { target: 0 } : false
    }

    const att = GURPS.findAttack(actor, action.name, !!action.isMelee, false) // find attack possibly using wildcards

    if (!att) {
      ui.notifications?.warn(`No melee attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)

      return calcOnly ? { target: 0 } : false
    }

    const mode = att.mode ? ` (${att.mode})` : ''

    const target = att.block.canBlock ? att.blockLevel : 0

    if (isNaN(target) || target === 0) {
      ui.notifications?.warn(`No Block for '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)

      return calcOnly ? { target: 0 } : false
    }

    const thing = stripBracketContents(att.name ? att.name : att.item.name)

    if (('calcOnly' in action && action.calcOnly) || calcOnly) {
      let modifier = parseInt(action.mod ?? '0') ?? 0

      if (isNaN(modifier)) modifier = 0

      return { target: target + modifier, thing: thing }
    }

    const targetmods: Modifier[] = []

    if (action.costs) GURPS.ModifierBucket.addModifier('0', action.costs, targetmods)
    if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc ?? '', targetmods)
    const aid = actor ? `@${actor.id}@` : ''
    const chatthing = thing === '' ? att.name + mode : `[${aid}B:"${thing}${mode}"]`

    return doRoll({
      actor,
      // @ts-expect-error -doRoll not properly typed yet. ToDo: refactor later
      targetmods,
      prefix: 'Block: ',
      thing,
      chatthing,
      origtarget: target,
      optionalArgs: { blind: action.blindroll, event },
      // @ts-expect-error -doRoll not properly typed yet. ToDo: refactor later
      action,
    })
      .then(result => {
        return !!result
      })
      .catch(error => {
        console.error('Error during doRoll:', error)

        return false
      })
  },

  ['weapon-parry']({ action, actor, event, calcOnly }: actionFuncParams) {
    if (action.type !== OtfActionType.weaponParry) return calcOnly ? { target: 0 } : false

    if (!actor) {
      ui.notifications?.warn(game.i18n?.localize('GURPS.chatYouMustHaveACharacterSelected') ?? '')

      return calcOnly ? { target: 0 } : false
    }

    const att = GURPS.findAttack(actor, action.name, !!action.isMelee, false) // find attack possibly using wildcards

    if (!att) {
      ui.notifications?.warn(`No melee attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)

      return calcOnly ? { target: 0 } : false
    }

    const mode = att.mode ? ` (${att.mode})` : ''
    const target = att.parryLevel

    if (isNaN(target) || target == 0) {
      ui.notifications?.warn(`No Parry for '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)

      return calcOnly ? { target: 0 } : false
    }

    const thing = stripBracketContents(att.name ? att.name : att.item.name)

    if (('calcOnly' in action && action.calcOnly) || calcOnly) {
      let modifier = parseInt(action.mod ?? '0')

      if (isNaN(modifier)) modifier = 0

      return { target: target + modifier, thing: thing }
    }

    const targetmods: Modifier[] = []

    if (action.costs) GURPS.ModifierBucket.addModifier('0', action.costs)
    if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc ?? '', targetmods)
    const aid = actor ? `@${actor.id}@` : ''
    const chatthing = thing === '' ? att.name + mode : `[${aid}P:"${thing}${mode}"]`

    return doRoll({
      actor,
      // @ts-expect-error -doRoll not properly typed yet. ToDo: refactor later
      targetmods,
      prefix: 'Parry: ',
      thing,
      chatthing,
      origtarget: target,
      optionalArgs: { blind: action.blindroll, event, obj: att },
      // @ts-expect-error -doRoll not properly typed yet. ToDo: refactor later
      action,
    })
      .then(result => {
        return !!result
      })
      .catch(error => {
        console.error('Error during doRoll:', error)

        return false
      })
  },

  attribute({ action, actor, event, originalOtf, calcOnly }) {
    if (action.type !== OtfActionType.attribute) return calcOnly ? { target: 0 } : false

    // This can be complicated because Attributes (and Skills) can be pre-targeted (meaning we don't need an actor).
    // If no actor OR action.target, then we can't do anything, so error out.
    if (!actor && (!action || !action.target)) {
      ui.notifications?.warn('You must have a character selected')

      return calcOnly ? { target: 0 } : false
    }

    // Is it pre-targeted (e.g., ST12)? If no, target = NaN, and we'll try to find it on the actor.
    let target = action.target ? parseInt(action.target) : undefined

    if (!target && !!actor) {
      if (action.melee) {
        // Is it trying to match to an attack name (should only occur with Parry: & Block:
        const meleeAttack = GURPS.findAttack(actor, action.melee) as MeleeAttackModel | undefined

        if (meleeAttack) {
          target =
            action.attribute.toLowerCase() === 'parry'
              ? meleeAttack.parryLevel
              : action.attribute.toLowerCase() === 'block'
                ? meleeAttack.blockLevel
                : undefined
        }
      } else {
        target = parseInt(foundry.utils.getProperty(actor.system, action.path) as string)
      }
    }

    const thing = action.name

    if (!target) {
      return calcOnly ? { target: 0 } : false
    }

    if (calcOnly) {
      let modifier = parseInt(action.mod ?? '0')

      if (isNaN(modifier)) modifier = 0

      return { target: target + modifier, thing: thing }
    }

    return (async () => {
      const targetmods: Modifier[] = []
      const aid = actor ? `@${actor.id}@` : ''
      const chatthing = originalOtf ? `[${aid}${originalOtf}]` : `[${aid}${thing}]`
      const opt = {
        blind: action.blindroll,
        event: event,
        action: action,
        /* @ts-expect-error - there is no obj on this kind of action. Do we need one in some cases? ToDo: investigate */
        obj: action.obj,
        text: '',
      }

      if (opt.obj?.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event, actor ?? null))) return false
      if (opt.obj?.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event, actor ?? null)
      opt.text = ''
      if (action.costs) GURPS.ModifierBucket.addModifier('0', action.costs)
      if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc ?? '', targetmods)
      else if (action.desc) opt.text = "<span style='font-size:85%'>" + action.desc + '</span>'
      if (action.overridetxt) opt.text += "<span style='font-size:85%'>" + action.overridetxt + '</span>'

      return !!(await doRoll({
        actor,
        // @ts-expect-error -doRoll not properly typed yet. ToDo: refactor later
        targetmods,
        prefix: game.i18n?.localize('GURPS.rollVs') ?? '',
        thing,
        chatthing,
        origtarget: target,
        optionalArgs: opt,
        // @ts-expect-error -doRoll not properly typed yet. ToDo: refactor later
        action,
      }))
    })()
  },

  ['skill-spell']({ action, actor, event, originalOtf, calcOnly }) {
    if (action.type !== OtfActionType.skillSpell) return calcOnly ? { target: 0 } : false

    if (!actor && (!action || !action.target)) {
      ui.notifications?.warn(game.i18n?.localize('GURPS.chatYouMustHaveACharacterSelected') ?? '')

      return calcOnly ? { target: 0 } : false
    }

    const target = processSkillSpell({ action, actor })

    if (!action) {
      return calcOnly ? { target: 0 } : false
    }

    const thing = stripBracketContents(action.name)

    if (calcOnly) {
      let modifier = parseInt(action.mod ?? '')

      if (isNaN(modifier)) modifier = 0

      return { target: target + modifier, thing: thing }
    }

    return (async () => {
      const targetmods: Modifier[] = []
      const aid = actor ? `@${actor.id}@` : ''
      const chatthing = originalOtf ? `[${aid}${originalOtf}]` : `[${aid}S:"${thing}"]`
      const opt = {
        blind: action.blindroll,
        event,
        action,
        /* @ts-expect-error - obj is dynamically added to action in processSkillSpell. ToDo: refactor later*/
        obj: action.obj,
        text: '',
      }

      if (opt.obj?.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event, actor ?? null))) return false
      if (opt.obj?.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event, actor ?? null)

      if (action.costs) GURPS.ModifierBucket.addModifier('0', action.costs)
      if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc ?? '', targetmods)
      else if (action.desc) opt.text = "<span style='font-size:85%'>" + action.desc + '</span>'
      if (action.overridetxt) opt.text += "<span style='font-size:85%'>" + action.overridetxt + '</span>'

      // @ts-expect-error -doRoll not properly typed yet. ToDo: refactor later
      return !!(await doRoll({ actor, targetmods, thing, chatthing, origtarget: target, optionalArgs: opt, action }))
    })()
  },

  /*
                  [AMRS][DPK]
                  A: ads & attack (melee & range)
                  AD: ads
                  AT: attack
                  M: melee
                  R: ranged
                  S: skills & spells
                  SK: skills
                  SP: spells
                  */
  // ['test-exists']({ action, actor, _event, originalOtf, calcOnly }) {
  ['test-exists']({ action, actor, calcOnly }: actionFuncParams) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.testExists) return false

    switch (action.prefix) {
      case 'A':
        if (GURPS.findAdDisad(actor, action.name)) return true
        if (GURPS.findAttack(actor, action.name, true, true)) return true

        return false
      case 'AD':
        if (GURPS.findAdDisad(actor, action.name)) return true

        return false
      case 'AT':
        if (GURPS.findAttack(actor, action.name, true, true)) return true

        return false
      case 'M':
        if (GURPS.findAttack(actor, action.name, true, false)) return true

        return false
      case 'R':
        if (GURPS.findAttack(actor, action.name, false, true)) return true

        return false
      case 'S':
        if (GURPS.findSkillSpell(actor, action.name, false, false)) return true

        return false
      case 'SK':
        if (GURPS.findSkillSpell(actor, action.name, true, false)) return true

        return false
      case 'SP':
        if (GURPS.findSkillSpell(actor, action.name, false, true)) return true

        return false
    }

    return false
  },

  href({ action, calcOnly }) {
    if (calcOnly) return { target: 0 }
    if (action.type !== OtfActionType.href) return false
    window.open(action.orig, action.label)

    return true
  },
}

function processSkillSpell({
  action,
  actor,
}: {
  action: SkillSpellRollAction
  actor: Actor.Implementation | null
}): number {
  if (action.target) {
    // Skill-12
    return action.target
  }

  //todo: properly type thiis function
  const skill = GURPS.findSkillSpell(actor, action.name, !!action.isSkillOnly, !!action.isSpellOnly) as
    | GurpsItemV2<ItemType.Skill>
    | GurpsItemV2<ItemType.Spell>
    | null

  if (!skill) {
    return 0
  }

  let skillLevel = skill.system?.level

  // @ts-expect-error - dynamically adding obj property to action
  action.obj = skill
  if (skill.isOfType(ItemType.Skill)) action.isSkillOnly = true
  if (skill.isOfType(ItemType.Spell)) action.isSpellOnly = true

  // on a floating skill check, we want the skill with the highest relative skill level
  if (action.floatingAttribute) {
    if (actor) {
      const value = foundry.utils.getProperty(actor.system, action.floatingAttribute) as string
      const rsl = skill.system.relativelevel //  this is something like 'IQ-2' or 'Touch+3'
      const valueText = rsl.replace(/^.*([+-]\d+)$/g, '$1')

      skillLevel = valueText === rsl ? parseInt(value) : parseInt(valueText) + parseInt(value)
    } else {
      ui.notifications?.warn('You must have a character selected to use a "Based" Skill')
    }
  }

  return skillLevel
}

