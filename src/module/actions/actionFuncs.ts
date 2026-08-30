import { Damage } from "@module/damage/index.ts"
import { addBucketToDamage, doRoll } from "@module/dierolls/dieroll.js"
import { OtfAction, OtfActionType } from "@module/otf/types.js"
import * as Settings from '@module/util/miscellaneous-settings.js'
import { getTokenForActor } from "@module/util/token.js"


  export  interface actionFuncParams {
        action: OtfAction
        actor?: Actor.Implementation
        event?: PointerEvent //toDo: this can have several custom attributes. Change to an custom interface
        targets?: string[]
        originalOtf?: string
        calcOnly?: boolean
      }

  export type actionFunc = (param: actionFuncParams) => Promise<{ target: number } | boolean> | { target: number } | boolean

  export const actionFuncs: Record<string, actionFunc> =
  {
    /**
     * @param {Object} data
     * @param {Object} data.actor
     * @param {Object} data.action
     * @param {string} data.action.link
     */
    pdf({ action }: actionFuncParams) {
      if (!action.link) {
        ui.notifications?.warn('no link was parsed for the pdf')

        return false // if there's no link action fails
      }

      GURPS.modules.Pdf.handlePdf(action.link)

      return true
    },

    //
    iftest({ action }) {
      if (!GURPS.lastTargetedRoll) return false
      if (action.name == 'isCritSuccess') return GURPS.lastTargetedRoll.isCritSuccess
      if (action.name == 'isCritFailure') return GURPS.lastTargetedRoll.isCritFailure

      if (!action.equation)
        // if [@margin] tests for >=0
        return (GURPS.lastTargetedRoll.margin) >= 0
      else {
        const match = action.equation?.match(/ *([=<>]+) *([+-]?[\d.]+)/)
        
        if (!Array.isArray(match) || match.length != 2) {
          ui.notifications?.warn('equation for fi test could not be parsed')

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


    modifier({ action }) {
    
      if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc ?? '')

      if (action.next && action.next.type === OtfActionType.modifier) {
        return this.modifier({ action: action.next }) // recursion, but you need to wrap the next action in an object using the 'action' attribute
      }

      return true
    },

    async chat({ action, actor, event }) {
      if (!event) return false
      // @ts-expect-error - Foundry VTT API not fully typed
      const ctrlKey = game.keyboard.isModifierActive(foundry.helpers.interaction.KeyboardManager.MODIFIER_KEYS.CONTROL)
      const chat = `/setEventFlags ${!!action.quiet} ${!!event.shiftKey} ${ctrlKey}\n${action.orig}`

      if (action.overridetxt) {
        // @ts-expect-error - custom chatmsgData property added to MouseEvent
        if (!event?.data) event.data = {}
        // @ts-expect-error - custom chatmsgData property added to MouseEvent
        event.data.overridetxt = action.overridetxt
      }

      const savedActor = GURPS.LastActor

      if (actor) GURPS.SetLastActor(actor) // try to ensure the correct last actor.
      // @ts-expect-error - custom chatmsgData property added to MouseEvent
      const ret = await GURPS.ChatProcessors.startProcessingLines(chat, event?.chatmsgData, event)

      if (savedActor) GURPS.SetLastActor(savedActor)

      return ret
    },
    
    dragdrop({ action }) {
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
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.mod
     * @param {string} data.action.desc
     * @param {string} data.action.formula
     * @param {string} data.action.damagetype
     * @param {string} data.action.extdamagetype
     * @param {string} data.action.hitlocation
     * @param {string} data.action.costs
     * @param {boolean} data.action.accumulate
     *
     * @param {JQuery.Event|null} data.event
     * @param {GurpsActorV2|null} data.actor
     * @param {string[]} data.targets
     */
    async damage({ action, event, actor, targets }) {
      // accumulate action fails if there's no selected actor
      if (action.accumulate && !actor) {
        ui.notifications?.warn(game.i18n?.localize('GURPS.chatYouMustHaveACharacterSelected') ?? '')

        return false
      }

      let canRoll = { canRoll: true, targetMessage: '' }
      const token = getTokenForActor(actor) ?? null

      if (actor && token) canRoll = (await actor.canRoll(action, token)) as { canRoll: true; targetMessage: '' }

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

      if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc) // special case where Damage comes from [D:attack + mod]

      const taggedSettings = game.settings?.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
      let displayFormula = action.formula ?? ''

      if (actor && taggedSettings?.autoAdd) {
        await actor.addTaggedRollModifiers('', { obj: action }, action.att)
        displayFormula = addBucketToDamage(displayFormula, false)
      }

      return await Damage.rollDamage(
        canRoll,
        token,
        actor ?? null,
        displayFormula,
        action.formula ?? '',
        action,
        event,
        null,
        targets
      )
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.damagetype
     * @param {string} data.action.formula
     * @param {string} data.action.costs
     * @param {string} data.action.derivedformula
     * @param {string} data.action.extdamagetype
     * @param {string} data.action.hitlocation
     * @param {boolean} data.action.accumulate
     *
     * @param {JQuery.Event|null} data.event
     * @param {GurpsActorV2|null} data.actor
     * @param {string[]} data.targets
     */
    async deriveddamage({ action, event, actor, targets }) {
      // action fails if there's no selected actor
      if (!actor) {
        ui.notifications?.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

        return false
      }

      let df = action.derivedformula.match(/sw/i) ? actor.system.swing : actor.system.thrust

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

      if (action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)

      if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc) // special case where Damage comes from [D:attack + mod]

      const taggedSettings = game.settings.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_TAGGED_MODIFIERS)
      let displayFormula = formula

      if (actor && taggedSettings.autoAdd) {
        await actor.addTaggedRollModifiers('', { action }, action.att)
        displayFormula = addBucketToDamage(displayFormula, false)
      }

      let canRoll = { result: true }
      const token = getTokenForActor(actor)

      if (actor) canRoll = await actor.canRoll(action, token)

      if (!canRoll.canRoll) {
        if (canRoll.targetMessage) {
          ui.notifications?.warn(canRoll.targetMessage)

          return false
        }
      }

      const overrideText = action.derivedformula + action.formula.replace(/([+-]\d+).*/g, '$1')

      await Damage.rollDamage(canRoll, token, actor, displayFormula, formula, action, event, overrideText, targets)

      if (action.next) {
        return GURPS.performAction(action.next, actor, event, targets)
      }

      return true
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.name
     * @param {boolean} data.action.isMelee
     * @param {boolean} data.action.isRanged
     * @param {string} data.action.costs
     * @param {string} data.action.mod
     * @param {string} data.action.desc
     *
     * @param {JQuery.Event|null} data.event
     * @param {GurpsActorV2|null} data.actor
     * @param {string[]} data.targets
     */
    attackdamage({ action, event, actor, targets }) {
      // action fails if there's no selected actor
      if (!actor) {
        ui.notifications?.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

        return false
      }

      if (!action.name) {
        ui.notifications?.warn('attack damage action has no name')

        return false
      }

      let att = null

      att = GURPS.findAttack(actor.system, action.name, !!action.isMelee, !!action.isRanged) // find attack possibly using wildcards

      if (!att) {
        ui.notifications.warn(
          `No melee or ranged attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`
        )

        return false
      }

      if (action.calcOnly) return att.damage

      let dam = parseForRollOrDamage(att.damage)

      if (!dam) {
        ui.notifications?.warn('Damage is not rollable')

        return false
      }

      dam.action.costs = action.costs
      dam.action.mod = action.mod
      dam.action.desc = action.desc
      dam.action.att = att

      return performAction(dam.action, actor, event, targets)
    },
    
    roll({ action, actor, event }) {
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

      if (action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)

      return doRoll({
        actor,
        formula: action.formula,
        prefix,
        optionalArgs: { blind: action.blindroll, event },
      })
        .then(result => {
          return result
        })
        .catch(error => {
          console.error('Error during doRoll:', error)

          return false
        })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.target
     * @param {string} data.action.desc
     * @param {boolean} data.action.blindroll
     *
     * @param {GurpsActorV2|null} data.actor
     * @param {JQuery.Event|null} data.event
     */
    controlroll({ action, actor, event }) {
      const target = parseInt(action.target)
      let aid = actor ? `@${actor.id}@` : ''
      let thing
      let chatthing

      if (action.desc) {
        thing = action.desc
        chatthing = `["${game.i18n.localize('GURPS.chatRollingCR')}, ${thing}"${aid}CR:${target} ${thing}]`
      } else {
        chatthing = `[${aid}CR:${target}]`
      }

      return doRoll({
        actor,
        thing,
        chatthing,
        origtarget: target,
        optionalArgs: { blind: action.blindroll, event },
        action,
      })
        .then(result => {
          return result
        })
        .catch(error => {
          console.error('Error during doRoll:', error)

          return false
        })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.derivedformula
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.formula
     * @param {boolean} data.action.blindroll
     *
     * @param {GurpsActorV2|null} data.actor
     * @param {JQuery.Event|null} data.event
     */
    derivedroll({ action, actor, event }) {
      if (!action.derivedformula) {
        ui.notifications.warn('derived roll with no derived formula')

        return false
      }

      if (!actor) {
        ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

        return false
      }

      let df = action.derivedformula.match(/[Ss][Ww]/) ? actor.system.swing : actor.system.thrust

      if (action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)

      // const originalFormula = action.derivedformula + action.formula
      return doRoll({
        actor,
        formula: d6ify(df + action.formula),
        prefix: game.i18n.format('GURPS.chatRolling', {
          dice: action.derivedformula,
          desc: action.desc,
        }),
        optionalArgs: { blind: action.blindroll, event },
      })
        .then(result => {
          return result
        })
        .catch(error => {
          console.error('Error during doRoll:', error)

          return false
        })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.name
     * @param {string} data.action.mod
     * @param {boolean} data.action.isMelee
     * @param {boolean} data.action.isRanged
     * @param {boolean} data.action.calcOnly
     * @param {boolean} data.action.blindroll
     *
     * @param {GurpsActorV2|null} data.actor
     * @param {JQuery.Event|null} data.event
     */
    async attack({ action, actor, event }) {
      if (!actor) {
        ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

        return false
      }

      if (!action.name) {
        ui.notifications.warn('attack action without name')

        return false
      }

      let att = GURPS.findAttack(actor.system, action.name, !!action.isMelee, !!action.isRanged) // find attack possibly using wildcards

      if (!att) {
        if (!action.calcOnly) {
          ui.notifications.warn(`No melee attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)
        }

        return false
      }

      let prefix = 'A:'

      if (!!action.isMelee && !action.isRanged) prefix = 'M:'
      if (!action.isMelee && !!action.isRanged) prefix = 'R:'
      let thing = stripBracketContents(att.name ? att.name : att.item.name)
      let qn = quotedAttackName({ name: thing, mode: att.mode })
      let aid = actor ? `@${actor.id}@` : ''
      const chatthing = `[${aid}${prefix}${qn}]`
      const followon = `[${aid}D:${qn}]`
      let target = att.level

      if (!target) {
        ui.notifications.warn(`attack named ${thing} has level of 0 or NaN`)

        return false
      }

      if (action.calcOnly) {
        let modifier = parseInt(action.mod) ?? 0

        if (isNaN(modifier)) modifier = 0

        return { target: target + modifier, thing: thing }
      }

      const opt = {
        blind: action.blindroll,
        event,
        obj: att, // save the attack in the optional parameters, in case it has rcl/rof
        followon,
        text: '',
      }

      if ('itemPath' in action) opt.itemPath = action.itemPath
      let targetmods = []

      if (opt.obj.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event, actor))) return false
      if (opt.obj.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event, actor)
      if (action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)

      const parsedRateOfFire = parseInt(att.rof)

      if (parsedRateOfFire > 1) {
        const shots = await GetNumberInput({
          title: game.i18n.localize('GURPS.combat.rof.numberOfShotsTitle'),
          headerText: action.orig,
          promptText: game.i18n.localize('GURPS.combat.rof.numberOfShotsPrompt'),
          label: game.i18n.format('GURPS.combat.rof.numberOfShotsLabel', { max: parsedRateOfFire }),
          min: 1,
          max: parsedRateOfFire,
          value: parsedRateOfFire,
        })

        const bonusForNumberOfShots = MissileWeaponAttacks.calculateRoFModifier(shots)

        if (bonusForNumberOfShots !== 0)
          GURPS.ModifierBucket.addModifier(
            bonusForNumberOfShots,
            game.i18n.format('GURPS.combat.rof.bonusLabel', { shots }),
            targetmods
          )
        opt.shots = shots
      }

      if (action.overridetxt) opt.text += "<span style='font-size:85%'>" + action.overridetxt + '</span>'

      return await doRoll({
        actor,
        targetmods,
        thing,
        chatthing,
        origtarget: target,
        optionalArgs: opt,
        action,
      })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.name
     * @param {string} data.action.mod
     * @param {boolean} data.action.isMelee
     * @param {boolean} data.action.calcOnly
     * @param {boolean} data.action.blindroll
     *
     * @param {GurpsActorV2|null} data.actor
     * @param {JQuery.Event|null} data.event
     */
    ['weapon-block']({ action, actor, event }) {
      if (!actor) {
        ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

        return false
      }

      let att = GURPS.findAttack(actor.system, action.name, !!action.isMelee, false) // find attack possibly using wildcards

      if (!att) {
        ui.notifications.warn(`No melee attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)

        return false
      }

      let mode = att.mode ? ` (${att.mode})` : ''

      const target = att.block.canBlock ? parseInt(att.blockLevel) : 0

      if (isNaN(target) || target === 0) {
        ui.notifications.warn(`No Block for '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)

        return false
      }

      const thing = stripBracketContents(att.name ? att.name : att.item.name)

      if (action.calcOnly) {
        let modifier = parseInt(action.mod) ?? 0

        if (isNaN(modifier)) modifier = 0

        return { target: target + modifier, thing: thing }
      }

      let targetmods = []

      if (action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)
      let aid = actor ? `@${actor.id}@` : ''
      const chatthing = thing === '' ? att.name + mode : `[${aid}B:"${thing}${mode}"]`

      return doRoll({
        actor,
        targetmods,
        prefix: 'Block: ',
        thing,
        chatthing,
        origtarget: target,
        optionalArgs: { blind: action.blindroll, event },
        action,
      })
        .then(result => {
          return result
        })
        .catch(error => {
          console.error('Error during doRoll:', error)

          return false
        })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.name
     * @param {string} data.action.mod
     * @param {boolean} data.action.isMelee
     * @param {boolean} data.action.calcOnly
     * @param {boolean} data.action.blindroll
     *
     * @param {GurpsActorV2|null} data.actor
     * @param {JQuery.Event|null} data.event
     */
    ['weapon-parry']({ action, actor, event }) {
      if (!actor) {
        ui.notifications.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

        return false
      }

      let att = GURPS.findAttack(actor.system, action.name, !!action.isMelee, false) // find attack possibly using wildcards

      if (!att) {
        ui.notifications.warn(`No melee attack named '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)

        return false
      }

      let mode = att.mode ? ` (${att.mode})` : ''
      const target = att.parryLevel

      if (isNaN(target) || target == 0) {
        ui.notifications.warn(`No Parry for '${action.name.replace('<', '&lt;')}' found on ${actor.name}`)

        return false
      }

      const thing = stripBracketContents(att.name ? att.name : att.item.name)

      if (action.calcOnly) {
        let modifier = parseInt(action.mod) ?? 0

        if (isNaN(modifier)) modifier = 0

        return { target: target + modifier, thing: thing }
      }

      let targetmods = []

      if (action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
      if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)
      let aid = actor ? `@${actor.id}@` : ''
      const chatthing = thing === '' ? att.name + mode : `[${aid}P:"${thing}${mode}"]`

      return doRoll({
        actor,
        targetmods,
        prefix: 'Parry: ',
        thing,
        chatthing,
        origtarget: target,
        optionalArgs: { blind: action.blindroll, event, obj: att },
        action,
      })
        .then(result => {
          return result
        })
        .catch(error => {
          console.error('Error during doRoll:', error)

          return false
        })
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.name
     * @param {string} data.action.mod
     * @param {boolean} data.action.isMelee
     * @param {boolean} data.action.blindroll
     * @param {string} [data.action.target]
     *
     * @param {GurpsActorV2|null} data.actor
     * @param {JQuery.Event|null} data.event
     * @param {string} data.originalOtf
     * @param {boolean} data.calcOnly
     */
    attribute({ action, actor, event, originalOtf, calcOnly }) {
      // This can be complicated because Attributes (and Skills) can be pre-targeted (meaning we don't need an actor).

      // If no actor OR action.target, then we can't do anything, so error out.
      if (!actor && (!action || !action.target)) {
        ui.notifications?.warn('You must have a character selected')

        return false
      }

      // Is it pre-targeted (e.g., ST12)? If no, target = NaN, and we'll try to find it on the actor.
      let target = parseInt(action.target)

      if (!target && !!actor) {
        if (action.melee) {
          // Is it trying to match to an attack name (should only occur with Parry: & Block:
          let meleeAttack = GURPS.findAttack(actor.system, action.melee)

          if (meleeAttack) {
            target = parseInt(meleeAttack[action.attribute.toLowerCase()]) // should only occur with parry & block
          }
        } else {
          target = parseInt(foundry.utils.getProperty(actor.system, action.path))
        }
      }

      const thing = action.name

      if (!target) {
        return false
      }

      if (calcOnly) {
        let modifier = parseInt(action.mod) ?? 0

        if (isNaN(modifier)) modifier = 0

        return { target: target + modifier, thing: thing }
      }

      return (async () => {
        let targetmods = []
        let aid = actor ? `@${actor.id}@` : ''
        const chatthing = originalOtf ? `[${aid}${originalOtf}]` : `[${aid}${thing}]`
        let opt = {
          blind: action.blindroll,
          event: event,
          action: action,
          obj: action.obj,
          text: '',
        }

        if (opt.obj?.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event, actor))) return false
        if (opt.obj?.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event, actor)
        opt.text = ''
        if (action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
        if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)
        else if (action.desc) opt.text = "<span style='font-size:85%'>" + action.desc + '</span>'
        if (action.overridetxt) opt.text += "<span style='font-size:85%'>" + action.overridetxt + '</span>'

        return doRoll({
          actor,
          targetmods,
          prefix: game.i18n.localize('GURPS.rollVs'),
          thing,
          chatthing,
          origtarget: target,
          optionalArgs: opt,
          action,
        })
      })()
    },
    /**
     * @param {Object} data
     *
     * @param {Object} data.action
     * @param {string} data.action.desc
     * @param {string} data.action.costs
     * @param {string} data.action.name
     * @param {string} data.action.mod
     * @param {boolean} data.action.blindroll
     * @param {string} [data.action.target]
     *
     * @param {GurpsActorV2|null} data.actor
     * @param {JQuery.Event|null} data.event
     * @param {string} data.originalOtf
     * @param {boolean} data.calcOnly
     */
    ['skill-spell']({ action, actor, event, originalOtf, calcOnly }) {
      if (!actor && (!action || !action.target)) {
        ui.notifications?.warn(game.i18n.localize('GURPS.chatYouMustHaveACharacterSelected'))

        return false
      }

      const target = processSkillSpell({ action, actor })

      if (!action) {
        return false
      }

      let thing = stripBracketContents(action.name)

      if (calcOnly) {
        let modifier = parseInt(action.mod) ?? 0

        if (isNaN(modifier)) modifier = 0

        return { target: target + modifier, thing: thing }
      }

      return (async () => {
        let targetmods = []
        let aid = actor ? `@${actor.id}@` : ''
        let chatthing = originalOtf ? `[${aid}${originalOtf}]` : `[${aid}S:"${thing}"]`
        let opt = {
          blind: action.blindroll,
          event,
          action,
          obj: action.obj,
          text: '',
        }

        if (opt.obj?.checkotf && !(await GURPS.executeOTF(opt.obj.checkotf, false, event, actor))) return false
        if (opt.obj?.duringotf) await GURPS.executeOTF(opt.obj.duringotf, false, event, actor)

        if (action.costs) GURPS.ModifierBucket.addModifier(0, action.costs)
        if (action.mod) GURPS.ModifierBucket.addModifier(action.mod, action.desc, targetmods)
        else if (action.desc) opt.text = "<span style='font-size:85%'>" + action.desc + '</span>'
        if (action.overridetxt) opt.text += "<span style='font-size:85%'>" + action.overridetxt + '</span>'

        return await doRoll({ actor, targetmods, thing, chatthing, origtarget: target, optionalArgs: opt, action })
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
    ['test-exists']({ action, actor }) {
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
    // href({ action, actor, event, originalOtf, calcOnly }) {
    href({ action }) {
      window.open(action.orig, action.label)
    },
  }