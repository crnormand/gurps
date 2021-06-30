'use strict'

import { makeRegexPatternFrom } from '../../lib/utilities.js'
import ChatProcessor from './chat-processor.js'
import * as Settings from '../../lib/miscellaneous-settings.js'

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
  process(line) {
    if (!GURPS.LastActor) {
      ui.notifications.error('Please select a token/character.')
      return
    }
    let actor = GURPS.LastActor
    let tblname = game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_FRIGHT_CHECK_TABLE) || 'Fright Check'

    // TODO reskin frightcheck UI
    let p = renderTemplate('systems/gurps/templates/frightcheck-macro.html', { tblname: tblname })
    p.then(dialogTemplate =>
      new Dialog(
        {
          title: 'Fright Check',
          content: dialogTemplate,
          buttons: {
            rollFrightCheck: {
              label: 'Roll Fright Check',
              callback: html => {
                let mod1 = html.find('#mod1')[0].value
                mod1 = parseInt(mod1, 10)
                let mod2 = html.find('#mod2')[0].value
                mod2 = parseInt(mod2, 10)
                let mod3 = html.find('#mod3')[0].value
                mod3 = parseInt(mod3, 10)
                let mod4 = html.find('#mod4')[0].value
                mod4 = parseInt(mod4, 10)
                let mod5 = html.find('#mod5')[0].value
                mod5 = parseInt(mod5, 10)
                let check1 = html.find('#check1')[0]
                let check2 = html.find('#check2')[0]
                let bodies1 = html.find('#bodies1')[0].value
                bodies1 = parseInt(bodies1, 10)
                let bodies2 = html.find('#bodies2')[0]
                let check3 = html.find('#check3')[0]
                let monster1 = html.find('#monster1')[0].value
                monster1 = parseInt(monster1, 10)
                let monster2 = html.find('#monster2')[0].value
                monster2 = parseInt(monster2, 10)
                let check4 = html.find('#check4')[0]
                let check4a = html.find('#check4a')[0]
                let check4b = html.find('#check4b')[0]
                let check5 = html.find('#check5')[0]
                let check6 = html.find('#check6')[0]
                let check7 = html.find('#check7')[0]
                let check8 = html.find('#check8')[0]
                let check9 = html.find('#check9')[0]

                let WILLVar = actor.data.data.frightcheck || actor.data.data.attributes.WILL.value
                WILLVar = parseInt(WILLVar, 10)

                let rollString = `3d6`
                let roll = Roll.create(rollString).evaluate({async: false})
                let fearMod = 0

                let chatContent = ``
                let totalMod = 0

                if (check1.checked) {
                  check1 = parseInt(check1.value, 10)
                  fearMod += check1
                }
                if (check2.checked) {
                  check2 = parseInt(check2.value, 10)
                  fearMod += check2
                }
                if (bodies2.checked) {
                  bodies2 = parseInt(bodies2.value, 10)
                  fearMod += bodies2
                }
                if (check3.checked) {
                  check3 = parseInt(check3.value, 10)
                  fearMod += check3
                }
                if (check4.checked) {
                  check4 = parseInt(check4.value, 10)
                  fearMod += check4
                }
                if (check4a.checked) {
                  check4a = parseInt(check4a.value, 10)
                  fearMod += check4a
                }
                if (check4b.checked) {
                  check4b = parseInt(check4b.value, 10)
                  fearMod += check4b
                }
                if (check5.checked) {
                  check5 = parseInt(check5.value, 10)
                  fearMod += check5
                }
                if (check6.checked) {
                  check6 = parseInt(check6.value, 10)
                  fearMod += check6
                }
                if (check7.checked) {
                  check7 = parseInt(check7.value, 10)
                  fearMod += check7
                }
                if (check8.checked) {
                  check8 = parseInt(check8.value, 10)
                  fearMod += check8
                }
                if (check9.checked) {
                  check9 = parseInt(check9.value, 10)
                  fearMod += check9
                }
                console.log('Fright Margin mod: ', fearMod)

                totalMod = fearMod + mod1 + mod2 + mod3 + mod4 + mod5 + bodies1 + monster1 + monster2
                let tm = totalMod >= 0 ? '+' + totalMod : totalMod
                console.log('Total mod before checked: ', totalMod)
                let targetRoll = totalMod + WILLVar
                let g13 = ''
                if (targetRoll > 13) {
                  targetRoll = 13
                  g13 = `<span style='font-size:small;font-style:italic'>(Cannot be greater than 13 [PDF:B360])</span><br><br>`
                }

                tblname = html.find('#tblname')[0].value
                game.settings.set(Settings.SYSTEM_NAME, Settings.SETTING_FRIGHT_CHECK_TABLE, tblname)
                if (roll.total > targetRoll) {
                  console.log('Fright Check FAIL')
                  fearMod = roll.total - targetRoll

                  //let frightEntry = fearMod + rollMod.total;

                  // Draw results using a custom roll formula
                  
                  let pat = new RegExp(makeRegexPatternFrom(tblname, false), 'i')
                  let tables = game.tables.contents.filter(t => t.name.match(pat))
                  if (tables.length == 0) {
                    ui.notifications.error("No table found for '" + tblname + "'")
                  } else if (tables.length > 1) {
                    ui.notifications.error("More than one table matched '" + tblname + "'")
                  } else {
                    let table = tables[0]
                    let tableRoll = Roll.create('3d6 + @rollvar', { rollvar: fearMod })
                    table.draw({ roll: tableRoll.evaluate() })
                  }
                  chatContent = `<div class='roll-result'><div class='roll-detail'><p>Fright Check is ${WILLVar}${tm} = ${targetRoll}</p>
              ${g13}
              <span><span class='fa fa-dice' />&nbsp;<span class='fa fa-long-arrow-alt-right' />
              ${roll.total}</span>
              <span class='failure'>Failed Final Fright Check by ${fearMod}</span></div></div>`
                } else {
                  console.log('Fright Check SUCCESS')
                  chatContent = `<div class='roll-result'><div class='roll-detail'><p>Fright Check is ${WILLVar}${tm} = ${targetRoll}</p>
              ${g13}
              <span><span class='fa fa-dice' />&nbsp;<span class='fa fa-long-arrow-alt-right' />
              ${roll.total}</span>
              <span class='success'>Fright Check SUCCESS!</span></div></div>`
                }
                ChatMessage.create({
                  type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                  speaker: {
                    alias: actor.name,
                  },
                  content: chatContent,
                  roll: JSON.stringify(roll),
                  rollMode: game.settings.get('core', 'rollMode'),
                })
              },
            },
            close: {
              label: 'Close',
            },
          },
        },
        { width: 500 }
      ).render(true)
    )
  }
}
