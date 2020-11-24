'use strict'

export const SYSTEM_NAME = 'gurps'
export const SETTING_DEFAULT_LOCATION = 'default-hitlocation'
export const SETTING_SIMPLE_DAMAGE = 'simple-damage'

export default function () {
  Hooks.once('init', async function () {
    // Register the setting.
    game.settings.register(SYSTEM_NAME, SETTING_DEFAULT_LOCATION, {
      name: 'Default hit location:',
      hint: 'Set the default hit location used to apply damage.',
      scope: 'world',
      config: true,
      type: String,
      choices: {
        'Torso': 'Torso',
        'Random': 'Random'
      },
      default: 'Torso',
      onChange: value => console.log(`Default hit location: ${value}`)
    })

    game.settings.register(SYSTEM_NAME, SETTING_SIMPLE_DAMAGE, {
      name: 'Use simple Apply Damage dialog:',
      hint: 'If true, only display the "Directly Apply" option in the Apply Damage dialog',
      scope: 'world',
      config: true,
      type: Boolean,
      default: false,
      onChange: value => console.log(`Use simply Apply Damage dialog : ${value}`)
    })

  })
}