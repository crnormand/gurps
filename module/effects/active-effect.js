export default function initActiveEffects() {
  Hooks.on('preCreateActiveEffect', async (effect, data, options, userId) => {
    if (!effect.data.duration.combat && game.combat) data.duration.combat = game.combats.active?.id
  })

  Hooks.on('createActiveEffect', async (effect, data, userId) => {
    console.log('create ' + effect)
    if (effect.getFlag('gurps', 'skipConfig') !== true) {
      let dialog = new ActiveEffectConfig(effect)
      await dialog.render(true)
    }
  })

  Hooks.on('applyActiveEffect', (...args) => {
    console.log('apply ' + args)
  })

  Hooks.on('updateActiveEffect', (effect, data, options, userId) => {
    console.log('update ' + effect)
  })

  Hooks.on('deleteActiveEffect', (effect, data, userId) => {
    console.log('delete ' + effect)
  })

  Hooks.on('updateCombat', (combat, data, options, userId) => {
    // get previous combatant { round: 6, turn: 0, combatantId: 'id', tokenId: 'id' }
    let previous = combat.previous
    let token = canvas.tokens.get(previous.tokenId)
    // go through all effects, removing those that have expired
    for (const effect of token.actor.effects) {
      let duration = effect.duration
      if (duration && !!duration.duration) {
        if (duration.remaining <= 1) {
          effect.delete()
        }
      }
    }
  })
}
