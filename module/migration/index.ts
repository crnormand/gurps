import { GurpsModule } from '../gurps-module.js'
import { MigrationRunner } from './runner.js'

/* ---------------------------------------- */

function init() {
  console.log('GURPS | Initializing GURPS Migration module.')

  Hooks.on('ready', () => {
    MigrationRunner.run()
  })
}

/* ---------------------------------------- */

export const Migration: GurpsModule = {
  init,
}
