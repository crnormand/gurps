'use strict'

import * as Settings from '../../lib/miscellaneous-settings.js'
import { makeRegexPatternFrom } from '../../lib/utilities.js'

import ChatProcessor from './chat-processor.js'

export class FrightCheckChatProcessor extends ChatProcessor {
  help() {
    return '/frightcheck (or /fc)'
  }

  isGMOnly() {
    return true
  }

  matches(line) {
    this.match = line.match(/^\/(fc|frightcheck)/)

    return !!this.match
  }

  async process() {
    if (!GURPS.LastActor) {
      ui.notifications.error('Please select a token/character.')

      return
    }

    let actor = GURPS.LastActor
    let tblname = game.settings.get(GURPS.SYSTEM_NAME, Settings.SETTING_FRIGHT_CHECK_TABLE) || 'Fright Check'

    const data = {
      tblname: tblname,
      fear: this.getFearModifier(actor) || 0,
      fearChoices: {
        0: game.i18n.localize('GURPS.none'),
        1: `${game.i18n.localize('GURPS.traits.fearlessness')} 1`,
        2: `${game.i18n.localize('GURPS.traits.fearlessness')} 2`,
        3: `${game.i18n.localize('GURPS.traits.fearlessness')} 3`,
        4: `${game.i18n.localize('GURPS.traits.fearlessness')} 4`,
        5: `${game.i18n.localize('GURPS.traits.fearlessness')} 5`,
        '-1': `${game.i18n.localize('GURPS.traits.fearfulness')} 1`,
        '-2': `${game.i18n.localize('GURPS.traits.fearfulness')} 2`,
        '-3': `${game.i18n.localize('GURPS.traits.fearfulness')} 3`,
        '-4': `${game.i18n.localize('GURPS.traits.fearfulness')} 4`,
        '-5': `${game.i18n.localize('GURPS.traits.fearfulness')} 5`,
      },
      combat: this.getCombatModifier(actor) || 0,
      combatChoices: {
        0: 'GURPS.none',
        2: 'GURPS.traits.combatReflexes',
        '-2': 'GURPS.traits.combatParalysis',
      },
      cowardice: this.getCowardiceModifier(actor) || 0,
      cowardiceChoices: {
        0: game.i18n.localize('GURPS.none'),
        '-1': `${game.i18n.localize('GURPS.traits.cowardice')} CR:15`,
        '-2': `${game.i18n.localize('GURPS.traits.cowardice')} CR:12`,
        '-3': `${game.i18n.localize('GURPS.traits.cowardice')} CR:9`,
        '-4': `${game.i18n.localize('GURPS.traits.cowardice')} CR:6`,
      },
      xenophilia: this.getXenophiliaModifier(actor) || 0,
      xenophiliaChoices: {
        0: game.i18n.localize('GURPS.none'),
        1: `${game.i18n.localize('GURPS.traits.xenophilia')} CR:15`,
        2: `${game.i18n.localize('GURPS.traits.xenophilia')} CR:12`,
        3: `${game.i18n.localize('GURPS.traits.xenophilia')} CR:9`,
        4: `${game.i18n.localize('GURPS.traits.xenophilia')} CR:6`,
      },
      daredevil: actor.findAdvantage(game.i18n.localize('GURPS.traits.daredevil')) || null,
    }

    // TODO reskin frightcheck UI
    new foundry.applications.api.DialogV2(
      {
        window: { title: 'Fright Check' },
        content: await foundry.applications.handlebars.renderTemplate(
          'systems/gurps/templates/frightcheck-macro.hbs',
          data
        ),
        buttons: [
          {
            action: 'rollFrightCheck',
            label: 'Roll Fright Check',
            icon: 'fa-solid fa-dice',
            default: true,
            callback: (event, button, dialog) =>
              this.rollFrightCheckCallback
                .bind(this)
                .call(this, actor, game.release.generation >= 13 ? dialog.element : dialog),
          },
          {
            icon: 'fa-solid fa-xmark',
            action: 'close',
            label: 'Close',
          },
        ],
      },
      { width: 650 }
    ).render(true)
  }

  getCombatModifier(actor) {
    const combatReflexes = actor.findAdvantage(game.i18n.localize('GURPS.traits.combatReflexes'))
    const combatParalysis = actor.findAdvantage(game.i18n.localize('GURPS.traits.combatParalysis'))

    return combatReflexes ? 2 : combatParalysis ? -2 : 0
  }

  getFearModifier(actor) {
    const fearless = actor.findAdvantage(game.i18n.localize('GURPS.traits.fearlessness'))
    const fearful = actor.findAdvantage(game.i18n.localize('GURPS.traits.fearfulness'))

    return fearless ? fearless.level || 0 : fearful ? -fearful.level || 0 : 0
  }

  getCowardiceModifier(actor) {
    const cowardice = actor.findAdvantage(game.i18n.localize('GURPS.traits.cowardice'))
    const cr = cowardice ? cowardice.cr || 0 : 0

    if (cr === 0) return 0
    if (cr <= 6) return -4
    if (cr <= 9) return -3
    if (cr <= 12) return -2
    if (cr <= 15) return -1

    return 0
  }

  getXenophiliaModifier(actor) {
    const xenophilia = actor.findAdvantage(game.i18n.localize('GURPS.traits.xenophilia'))
    const cr = xenophilia ? xenophilia.cr || 0 : 0

    if (cr === 0) return 0
    if (cr <= 6) return 4
    if (cr <= 9) return 3
    if (cr <= 12) return 2
    if (cr <= 15) return 1

    return 0
  }

  /**
   *
   * @param {*} html
   */
  async rollFrightCheckCallback(actor, html) {
    let selectIds = [
      '#mod2',
      '#mod3',
      '#mod4',
      '#mod5',
      '#check1',
      '#check2',
      '#bodies1',
      '#bodies2',
      '#monster1',
      '#monster2',
      '#check4a',
      '#check4b',
      '#check4',
      '#check5',
      '#check6',
      '#check7',
      '#check3',
      '#check10',
      '#check8',
      '#check9',
      '#mod1',
    ]
    let targetmods = []

    for (const id of selectIds) {
      //console.log(id)
      targetmods.push(this._getMod(html, id))
    }

    targetmods = targetmods.filter(it => it != null)

    let totalMod = targetmods.map(it => it.mod).reduce((a, b) => a + b, 0)
    let WILLVar = parseInt(actor.system.frightcheck || actor.system.attributes.WILL.value, 10)
    let finaltarget = totalMod + WILLVar

    // true or false?
    let ruleOf14 = finaltarget > 13

    finaltarget = ruleOf14 ? 13 : finaltarget

    let tblname = html.querySelector('#tblname').value
    let table = this._findFrightCheckTable(tblname)

    if (table) game.settings.set(GURPS.SYSTEM_NAME, Settings.SETTING_FRIGHT_CHECK_TABLE, table.name)

    let roll = Roll.create('3d6[Fright Check]')

    await roll.evaluate()

    let margin = finaltarget - roll.total
    let failure = margin < 0

    let content = await foundry.applications.handlebars.renderTemplate(
      'systems/gurps/templates/frightcheck-results.hbs',
      {
        WILLVar: WILLVar,
        targetmods: targetmods,
        finaltarget: finaltarget,
        ruleOf14: ruleOf14,
        rtotal: roll.total,
        failure: failure,
        margin: finaltarget - roll.total,
        loaded: roll.isLoaded,
        rolls: roll.dice[0].results.map(it => it.result).join(),
      }
    )

    await ChatMessage.create({
      type: CONST.CHAT_MESSAGE_STYLES.ROLL,
      speaker: ChatMessage.getSpeaker(actor),
      content: content,
      roll: JSON.stringify(roll),
      rollMode: game.settings.get('core', 'rollMode'),
    }).then(async () => {
      GURPS.setLastTargetedRoll({ margin: -margin }, actor)

      if (failure) {
        // Draw results using a custom roll formula. Use the negated margin for the rolltable only
        let tableRoll = Roll.create(`3d6[Fright Check table roll] + @margin`)

        if (!table) {
          ui.notifications.error('No Rollable Table found for ' + tblname)

          return
        }

        table.draw({ roll: tableRoll }).then(() => GURPS.setLastTargetedRoll({ margin: margin }, actor)) // don't evaluate before passing
      }
    })
  }

  _getMod(html, id) {
    let mod = html.querySelector(id)

    if (mod.type === 'select' || mod.type === 'select-one') {
      if (parseInt(mod.value, 10) === 0) return null

      return { mod: parseInt(mod.value, 10), desc: mod.options[mod.selectedIndex].text }
    } else if (mod.type === 'checkbox') {
      if (mod.checked) {
        let label = html.querySelector(`label[for="${mod.id}"]`).innerText

        return { mod: parseInt(mod.value, 10), desc: label }
      }
    } else if (mod.type === 'number') {
      if (parseInt(mod.value, 10) === 0) return null
      let label = html.querySelector(`label[for="${mod.id}"]`).innerText

      return { mod: parseInt(mod.value, 10), desc: label }
    }

    return null
  }

  _findFrightCheckTable(tblname) {
    let pat = new RegExp(makeRegexPatternFrom(tblname, false), 'i')
    let tables = game.tables.contents.filter(t => t.name.match(pat))

    if (tables.length == 0) {
      ui.notifications.error("No table found for '" + tblname + "'")
    } else if (tables.length > 1) {
      ui.notifications.error("More than one table matched '" + tblname + "'")
    } else {
      return tables[0]
    }

    return null
  }
}
