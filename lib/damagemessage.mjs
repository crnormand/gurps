'use strict'

export default class DamageChat {
  constructor() {
    this.setup()
  }

  setup() {
    let self = this

    Hooks.on('renderChatMessage', (app, html, msg) => {
      console.log(html)
      console.log(app)

      let damageMessage = html.find(".damage-message")[0]
      if (damageMessage) {
        damageMessage.setAttribute("draggable", true)

        damageMessage.addEventListener('dragstart', ev => {
          console.log(app.data.flags.transfer)
          return ev.dataTransfer.setData("text/plain", app.data.flags.transfer)
        })
      }
    })
  }
}

/*
let damageChatMessage = {
  dice: '3d+5',
  modifiers: [
    '+2 damage (Strong Attack)',
    '+2 damage (Mighty Blow) *Cost 1FP'
  ]
  damage: 21,
  type: 'cut',
  isB378: false
}
*/