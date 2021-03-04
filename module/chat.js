'use strict'
import { parselink } from '../lib/parselink.js'
import { NpcInput } from '../lib/npc-input.js'
import { Equipment } from './actor.js'

/**
 *  This holds functions for all things chat related
 *
 */
 
function whisper(priv) {
  if (priv.length == 0) return
  ChatMessage.create({
    alreadyProcessed: true,
    content: priv.join("<br>"),
    user: game.user._id,
    type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
    whisper: [game.user._id],
  })
  priv.length = 0
}
 
function chat(pub, chatData) {
  if (pub.length == 0) return;
  let d = duplicate(chatData)
  d.alreadyProcessed = true
  d.content = pub.join("<br>")
  ChatMessage.create(d)
  pub.length = 0
}

function send(priv, pub, data) {
  this.whisper(priv)
  this.chat(pub, data)
}

 
export default function addChatHooks() {

  Hooks.once('init', async function () {
   
    let send = (msgs) => {
      if (msgs.priv.length > 0) {
        ChatMessage.create({
          alreadyProcessed: true,
          content: msgs.priv.join("<br>"),
          user: game.user._id,
          type: CONST.CHAT_MESSAGE_TYPES.WHISPER,
          whisper: [game.user._id],
        })
        msgs.priv.length = 0
      }
      if (msgs.pub.length > 0) {
        msgs.data.alreadyProcessed = true
        msgs.data.content = msgs.pub.join("<br>")
        ChatMessage.create(msgs.data)
        msgs.pub.length = 0
      }
    }
    
    // Stack up as many public messages as we can, until we need to print a private one (to reduce the number of chat messages)
    let pub = (text, msgs) => {
      if (msgs.priv.length > 0) 
        send(msgs)
      msgs.pub.push(text);
    } 
    // Stack up as many private messages as we can, until we need to print a public one (to reduce the number of chat messages)
    let priv = (text, msgs) => {
      if (msgs.pub.length > 0) 
        send(msgs)
      msgs.priv.push(text);
    } 
    
    Hooks.on('chatMessage', (log, message, data) => {
      if (!!data.alreadyProcessed) return true    // The chat message has already been parsed for GURPS commands show it should just be displayed
      if (GURPS.ChatCommandsInProcess.includes(message)) {
        GURPS.ChatCommandsInProcess = GURPS.ChatCommandsInProcess.filter(item => item !== message)
        return true   // Ok. this is a big hack, and only used for singe line chat commands... but since arrays are synchronous and I don't expect chat floods, this is safe
      }
       
      // Is Dice So Nice enabled ?
      let niceDice = false
      try { niceDice = game.settings.get('dice-so-nice', 'settings').enabled; } catch { }
      let msgs = { pub: [], priv: [], data: data }
      let handled = false
      message.split('\n').forEach((line) => {
        var m
        if (line === '/help' || line === '!help') {
          let c = "<a href='" + GURPS.USER_GUIDE_URL + "'>GURPS 4e Game Aid USERS GUIDE</a>"
          c += '<br>/roll (or /r) [On-the-Fly formula]'
          c += '<br>/private (or /pr) [On-the-Fly formula]'
          c += '<br>/clearmb'
          c += '<br>/:&lt;macro name&gt'
          c += '<br>/fp &lt;formula&gt;'
          c += '<br>/hp &lt;formula&gt;'
          c += '<br>/trackerN (N=0-3) &lt;formula&gt;'
          c += '<br>/tracker(&lt;name&gt;) &lt;formula&gt;'
          c += '<br>/qty &lt;formula&gt; &lt;equipment name&gt;'
          c += '<br>/uses &lt;formula&gt; &lt;equipment name&gt;'
          c += '<br>/status on|off|t|toggle &lt;status&gt;'
          if (game.user.isGM) {
            c += '<br> --- GM only ---'
            c += '<br>/sendmb &lt;OtF&gt &lt;playername(s)&gt'
            c += '<br>/mook'
            c += '<br>/everyone (or /ev) &lt;formula&gt;'
          }
          priv(c, msgs);
          handled = true
          return
        }
        if (line === '/mook' && game.user.isGM) {
          new NpcInput().render(true)
          priv("Opening Mook Generator", msgs)
          handled = true
          return
        }
        
        m = line.match(/\/(st|status) (t|toggle|on|off|\+|-) ([^ ]+)(@self)?/i)
        if (!!m) {
          let pattern =  new RegExp('^' + (m[3].trim().split('*').join('.*').replace(/\(/g, '\\(').replace(/\)/g, '\\)')), 'i') // Make string into a RegEx pattern
          let any = false
          let on = false
          let set = m[2].toLowerCase() == "on" || m[2] == '+'
          let toggle = m[2].toLowerCase() == "t" || m[2].toLowerCase() == "toggle"
          var effect, msg
          Object.values(CONFIG.statusEffects).forEach(s => {
            let nm = game.i18n.localize(s.label)
            if (nm.match(pattern)) effect = s   // match on name or id (shock1, shock2, etc.)
            if (s.id.match(pattern)) effect = s
          })
          if (!effect) 
            ui.notifications.warn("No status matched '" + pattern + "'")
          else if (!!m[4]) {
            if (!!GURPS.LastActor) {
              let tokens = GURPS.LastActor?.getActiveTokens()
              if (tokens.length == 0)
                msg = "Your character does not have any tokens.   We require a token to set statuses"
              else {
                GURPS.LastActor.effects.forEach(e => { 
                  if (effect.id == e.getFlag("core", "statusId")) on = true 
                })
                if ((on & !set) || (!on && set) || toggle) {
                  priv(`Toggling ${game.i18n.localize(effect.label)} for ${GURPS.LastActor.name}`, msgs)
                  t.toggleEffect(effect)
                }
              } 
            } else msg = "You must select a character to apply status effects"
          } else {
            msg = "You must select tokens (or use @self) to apply status effects"
            canvas.tokens.controlled.forEach(t => {
              any = true
              if (!!t.actor) 
                t.actor.effects.forEach(e => { 
                  if (effect.id == e.getFlag("core", "statusId")) on = true 
                })
              if ((on & !set) || (!on && set) || toggle) {
                priv(`Toggling ${game.i18n.localize(effect.label)} for ${t.actor.name}`, msgs)
                t.toggleEffect(effect)
              }
            })
          }
          if (!any) ui.notifications.warn(msg)
          handled = true
          return          
        }
        
        m = line.match(/\/qty ([\+-=]\d+)(.*)/i)
        if (!!m) {
          let actor = GURPS.LastActor
          if (!actor)
            ui.notifications.warn('You must have a character selected')
          else {
            let m2 = m[2].trim().match(/^(o[\.:])?(.*)/i)
            let pattern = m2[2]
            let [eqt, key] = actor.findEquipmentByName(pattern, !!m2[1])
            if (!eqt)
              ui.notifications.warn("No equipment matched '" + pattern + "'")
            else {
              eqt = duplicate(eqt)
              let delta = parseInt(m[1])
              if (isNaN(delta)) {   // only happens with '='
                delta = parseInt(m[1].substr(1))
                if (isNaN(delta))
                  ui.notifications.warn(`Unrecognized format '${m[1]}'`)
                else {
                  eqt.count = delta
                  actor.update({ [key]: eqt }).then(() => actor.updateParentOf(key))
                  priv(`${eqt.name} set to ${delta}`, msgs)
                }
              } else {
                let q = parseInt(eqt.count) + delta
                if (q < 0) 
                  ui.notifications.warn("You do not have enough '" + eqt.name + "'")
                else {
                  priv(`${eqt.name} QTY ${m[1]}`, msgs)
                  eqt.count = q
                  actor.update({ [key]: eqt }).then(() => actor.updateParentOf(key))
                }
              } 
            }      
          }   
          handled = true
          return     
        }
        
        m = line.match(/\/uses ([\+-=]\w+)?(reset)?(.*)/i)
        if (!!m) {
          let actor = GURPS.LastActor
          if (!actor)
            ui.notifications.warn('You must have a character selected')
          else {
            let pattern = m[3].trim()
            let [eqt, key] = actor.findEquipmentByName(pattern)
            if (!eqt)
              ui.notifications.warn("No equipment matched '" + pattern + "'")
            else {
              eqt = duplicate(eqt)
              let delta = parseInt(m[1])
              if (!!m[2]) {
                priv(`${eqt.name} USES reset to MAX USES (${eqt.maxuses})`, msgs)
                eqt.uses = eqt.maxuses
                actor.update({ [key]: eqt })    
              } else if (isNaN(delta)) {   // only happens with '='
                delta = m[1].substr(1)
                eqt.uses = delta
                actor.update({ [key]: eqt })
                priv(`${eqt.name} USES set to ${delta}`, msgs)         
              } else {
                let q = parseInt(eqt.uses) + delta
                let max = parseInt(eqt.maxuses)
                if (isNaN(q))
                  ui.notifications.warn(eqt.name + " 'uses' is not a number")
                else if (q < 0) 
                  ui.notifications.warn(eqt.name + " does not have enough USES")
                else if (!isNaN(max) && max > 0 && q > max)
                  ui.notifications.warn("Exceeded max uses (${max}) for " + eqt.name)
                else {
                  priv(`${eqt.name} USES ${m[1]} = ${q}`, msgs)
                  eqt.uses = q
                  actor.update({ [key]: eqt })
                }
              } 
            }      
          }   
          handled = true
          return     
        }

        m = line.match(/\/([fh]p) ([+-=]\d+)?(reset)?(.*)/i)
        if (!!m) {
          let actor = GURPS.LastActor
          if (!actor)
            ui.notifications.warn('You must have a character selected')
          else {
            let attr = m[1].toUpperCase()
            let delta = parseInt(m[2])
            const max = actor.data.data[attr].max
            let reset = ''
            if (!!m[3]) {
              actor.update({ [ "data." + attr + ".value"] : max })
              priv(`${actor.name} reset to ${max} ${attr}`, msgs)
            } else if (isNaN(delta)) {   // only happens with '='
              delta = parseInt(m[2].substr(1))
              if (isNaN(delta))
                ui.notifications.warn(`Unrecognized format for '/${attr} ${m[4]}'`)
              else {
                let mtxt = ''
                if (delta > max) {
                  delta = max
                  mtxt = ` (max: ${max})`
                }
                actor.update({ [ "data." + attr + ".value"] : delta })
                priv(`${actor.name} set to ${delta} ${attr}${mtxt}`, msgs)
              }
            } else if (!!m[2]) {
                let mtxt = ''
                delta += actor.data.data[attr].value
                if (delta > max) {
                  delta = max
                  mtxt = ` (max: ${max})`
                }
              actor.update({ [ "data." + attr + ".value"] : delta })
              priv(`${actor.name} ${m[2]} ${attr}${mtxt}`, msgs)
            } else
              ui.notifications.warn(`Unrecognized format for '/${attr} ${m[4]}'`)
          }  
          handled = true
          return      
        }
 
        m = line.match(/\/(tracker|tr|rt|resource)([0123])?(\(([^\)]+)\))? ([+-=]\d+)?(reset)?(.*)/i)
        if (!!m) {
          let actor = GURPS.LastActor
          if (!actor)
            ui.notifications.warn('You must have a character selected')
          else {
            let tracker = parseInt(m[2])
            let display = tracker
            if (!!m[3]) {
              for (const [key, value] of Object.entries(actor.data.data.additionalresources.tracker)) {
                if (value.name.match(m[4])) {
                  tracker = key
                  display = "(" + value.name + ")"
                }
              } 
            }
            let delta = parseInt(m[5])
            let reset = ''
            let max = actor.data.data.additionalresources.tracker[tracker].max
            if (!!m[6]) {
              actor.update({ ["data.additionalresources.tracker." + tracker + ".value"] : max})
              priv(`Resource Tracker${display} reset to ${max}`, msgs)
            } else if (isNaN(delta)) {    // only happens with '='
              delta = parseInt(m[5].substr(1))
              if (isNaN(delta))
                ui.notifications.warn(`Unrecognized format for '${line}'`)
              else {
                actor.update({ ["data.additionalresources.tracker." + tracker + ".value"] : delta})
                priv(`Resource Tracker${display} set to ${delta}`, msgs)
              }           
            } else if (!!m[5]) {
              if (max == 0) max = Number.MAX_SAFE_INTEGER
              let v = actor.data.data.additionalresources.tracker[tracker].value + delta
              if (v > max) {
                ui.notifications.warn(`Exceeded MAX:${max} for Resource Tracker${tracker}`)
                v = max
              }
              actor.update({ ["data.additionalresources.tracker." + tracker + ".value"] : v })
              priv(`Resource Tracker${display} ${m[5]} = ${v}`, msgs)
            } else
              ui.notifications.warn(`Unrecognized format for '${line}'`)
          }  
          handled = true
          return      
        }
     
        // /everyone +1 fp or /everyone -2d-1 fp
        m = line.match(/\/(everyone|ev) ([fh]p) ([+-]\d+d\d*)?([+-=]\d+)?(!)?/i);
        if (!!m && (!!m[3] || !!m[4])) {
          if (game.user.isGM) {
            let any = false
            game.actors.entities.forEach(actor => {
              if (actor.hasPlayerOwner) {
                any = true
                let mod = m[4] || ""
                let value = mod
                let dice = m[3] || "";
                let txt = ''
                if (!!dice) {
                  let sign = (dice[0] == "-") ? -1 : 1
                  let d = dice.match(/[+-](\d+)d(\d*)/)
                  let r = d[1] + "d" + (!!d[2] ? d[2] : "6")
                  let roll = Roll.create(r).evaluate()
                  if (niceDice) game.dice3d.showForRoll(roll, game.user, data.whisper)
                  value = roll.total
                  if (!!mod)
                    if (isNaN(mod)) {
                      ui.notifications.warn(`Unrecognized format for '${line}'`)
                      handled = true
                      return              
                    } else value += parseInt(mod)
                  value = Math.max(value, !!m[5] ? 1 : 0)
                  value *= sign
                  txt = `(${value}) `
                } 
                let attr = m[2].toUpperCase()
                let cur = actor.data.data[attr].value
                let newval = parseInt(value)
                if (isNaN(newval)) {    // only happens on =10
                  newval = parseInt(value.substr(1))
                  if (isNaN(newval)) {
                    ui.notifications.warn(`Unrecognized format for '${line}'`)
                    handled = true
                    return
                  }
                } else newval += cur
                let mtxt = ''
                let max = actor.data.data[attr].max
                if (newval > max) {
                  newval = max
                  mtxt = `(max: ${max})`
                }
                actor.update({ [ "data." + attr + ".value"] : newval })
                priv(`${actor.name} ${attr} ${dice}${mod} ${txt}${mtxt}`, msgs)
              }
            }) 
            if (!any) priv(`There are no player owned characters!`, msgs)
          } else
            priv(`You must be a GM to execute '${line}'`, msgs)
          handled = true
          return
         }
        
        // /everyone fp/hp reset
        m = line.match(/\/(everyone|ev) ([fh]p) reset/i);
        if (!!m) {
          if (game.user.isGM) {
            let any = false
            game.actors.entities.forEach(actor => {
             if (actor.hasPlayerOwner) {
                any = true
                let attr = m[2].toUpperCase()
                let max = actor.data.data[attr].max
                actor.update({ [ "data." + attr + ".value"] : max })
                priv(`${actor.name} ${attr} reset to ${max}`, msgs)
              }
            })  
            if (!any) priv(`There are no player owned characters!`, msgs)
         } else
            priv(`You must be a GM to execute '${line}'`, msgs)
          handled = true
          return
        }
 
        m = line.match(/^(\/r|\/roll|\/pr|\/private) \[([^\]]+)\]/)
        if (!!m && !!m[2]) {
          let action = parselink(m[2])
          if (!!action.action) {
            if (action.action.type === 'modifier')  // only need to show modifiers, everything else does something.
              priv(line, msgs)
            else
              send(msgs) // send what we have
            GURPS.performAction(action.action, GURPS.LastActor, { shiftKey: line.startsWith('/pr') })   // We can't await this until we rewrite Modifiers.js to use sockets to update stacks
          } else
            pub(line, msgs)   // Looks like an OtF, but didn't parse as one
          handled = true
          return
       } 
        if (line === '/clearmb') {
          priv(line, msgs);
          GURPS.ModifierBucket.clear()
          handled = true
          return
        }
        if (line.startsWith('/sendmb')) {
          if (game.user.isGM) {
            priv(line, msgs)
            let user = line.replace(/\/sendmb/, '').trim()
            let m = user.match(/\[(.*)\](.*)/)
            if (!!m) {
              let otf = m[1]
              let t = parselink(otf)
              if (!!t.action && t.action.type == 'modifier')
                GURPS.ModifierBucket.sendToPlayer(t.action, m[2])
              else
                GURPS.ModifierBucket.sendBucketToPlayer(user)
            }
            else
              GURPS.ModifierBucket.sendBucketToPlayer(user)
          } else 
            priv(`You must be a GM to execute '${line}'`, msgs)
          handled = true
          return
        }
        if (line.startsWith("/:")) {
          m = Object.values(game.macros.entries).filter(m => m.name.startsWith(line.substr(2)));
          if (m.length > 0) {
            send(msgs)
            m[0].execute()
          } else
            priv(`Unable to find macro named '${line.substr(2)}'`, msgs)
          handled = true
          return
        }
        if (line.trim().startsWith("/")) {// immediately flush our stored msgs, and execute the slash command using the default parser
          handled = true
          send(msgs)
          GURPS.ChatCommandsInProcess.push(line)  // Remember which chat message we are running, so we don't run it again!
          ui.chat.processMessage(line).catch(err => {
            ui.notifications.error(err);
            console.error(err);
          })
        } else
          pub(line, msgs)  // If not handled, must just be public text
      })  // end split
      if (handled) {  // If we handled 'some' messages, then send the remaining messages, and return false (so the default handler doesn't try)
        send(msgs)
        return false    // Don't display this chat message, since we have handled it with others
      } else return true
    })
  
    // Look for blind messages with .message-results and remove them
    /*  Hooks.on("renderChatMessage", (log, content, data) => {
      if (!!data.message.blind) {
          if (data.author?.isSelf && !data.author.isGm) {   // We are rendering the chat message for the sender (and they are not the GM)
            $(content).find(".gurps-results").html("...");  // Replace gurps-results with "...".  Does nothing if not there.
          }
        }
      });  */
  
      // Add the "for" attribute to a collapsible panel label. This is needed
      // because the server in 0.7.8 strips the "for" attribute in an attempt
      // to guard against weird security hacks. When "for" is whitelisted as
      // a valid attribute (future) we can remove this.
      Hooks.on('renderChatMessage', (app, html, msg) => {
        // this is a fucking hack
        let wrapper = html.find('.collapsible-wrapper')
        if (wrapper.length > 0) {
          console.log($(wrapper).html())
          let input = $(wrapper).find('input.toggle')[0]
          let label = $(input).siblings('label.label-toggle')[0]
          let id = input.id
          let labelFor = $(label).attr('for')
          if (labelFor !== id) {
            $(label).attr('for', id)
          }
          console.log($(wrapper).html())
        }
      })
      
      // Look for RESULTS from a RollTable.   RollTables do not generate regular chat messages
      Hooks.on('preCreateChatMessage', (data, options, userId) => {
      let c = data.content
      try {
        let html = $(c)
        let rt = html.find('.result-text') // Ugly hack to find results of a roll table to see if an OtF should be "rolled" /r /roll
        let re = /^(\/r|\/roll|\/pr|\/private) \[([^\]]+)\]/
        let t = rt[0]?.innerText
        if (!!t) {
          t.split('\n').forEach((e) => {
            let m = e.match(re)
            if (!!m && !!m[2]) {
              let action = parselink(m[2])
              if (!!action.action) {
                GURPS.performAction(action.action, GURPS.LastActor, {
                  shiftKey: e.startsWith('/pr'),
                })
                //          return false; // Return false if we don't want the rolltable chat message displayed.  But I think we want to display the rolltable result.
              }
            }
          })
        }
      } catch (e) { } // a dangerous game... but limited to GURPs /roll OtF
      data.content = game.GURPS.gurpslink(c)
    })
  
    Hooks.on('renderChatMessage', (app, html, msg) => {
      GURPS.hookupGurps(html)
    })
  
  })    // End of "ready"
}