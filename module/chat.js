'use strict'
import { parselink } from '../lib/parselink.js'
import { NpcInput } from '../lib/npc-input.js'

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

  Hooks.once('ready', async function () {
   
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
        if (line === '/help' || line === '!help') {
          let c = "<a href='" + GURPS.USER_GUIDE_URL + "'>GURPS 4e Game Aid USERS GUIDE</a>"
          c += '<br>/roll (or /r) [On-the-Fly formula]'
          c += '<br>/private (or /pr) [On-the-Fly formula]'
          c += '<br>/clearmb'
          c += '<br>/:&lt;macro name&gt'
          if (game.user.isGM) {
            c += '<br> --- GM only ---'
            c += '<br>/sendmb &lt;playername&gt'
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
      
        // /everyone +1 fp or /everyone -2d-1 fp
        let m = line.match(/\/(everyone|ev) ([+-]\d+d)?([+-]\d+)?(!)? ?([FfHh][Pp])/);
        if (!!m) {
          if (game.user.isGM) {
            game.actors.entities.forEach(actor => {
              let users = actor.getUsers(CONST.ENTITY_PERMISSIONS.OWNER).filter(o => !o.isGM)
              if (users.length > 0) {
                let mod = m[3] || ""
                let value = mod;
                let dice = m[2] || "";
                if (!!dice) {
                  let sign = (dice[0] == "-") ? -1 : 1
                  let roll = Roll.create(dice.substring(1, dice.length) + "6 " + mod).evaluate()
                  if (niceDice) game.dice3d.showForRoll(roll, game.user, data.whisper)
                  value = Math.max(roll.total, !!m[4] ? 1 : 0)
                  value *= sign
                  if (!!m[4]) mod += m[4]
                } 
                let attr = m[5].toUpperCase()
                let cur = actor.data.data[attr].value
                let newval = cur + parseInt(value)
                if (newval > actor.data.data[attr].max) newval = Math.max(cur, actor.data.data[attr].max)
                actor.update({ [ "data." + attr + ".value"] : newval })
                let t = (mod != value) ? `(${value})` : ""
                priv(`${actor.name} ${dice}${mod} ${t} ${m[5]}`, msgs)
              }
            }) 
          } else
            priv(`You must be a GM to execute '${line}'`, msgs)
          handled = true
          return
         }
        
        // /everyone reset fp/hp
        m = line.match(/\/(everyone|ev) reset ([FfHh][Pp])/);
        if (!!m) {
          if (game.user.isGM) {
            game.actors.entities.forEach(actor => {
              let users = actor.getUsers(CONST.ENTITY_PERMISSIONS.OWNER).filter(o => !o.isGM)
              if (users.length > 0) {
                handled = true
                let attr = m[2].toUpperCase()
                let max = actor.data.data[attr].max
                actor.update({ [ "data." + attr + ".value"] : max })
                priv(`${actor.name} reset to ${max} ${m[2]}`, msgs)
              }
            })  
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
  