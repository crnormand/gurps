import { GurpsActor } from 'module/actor/actor.js'

declare global {
  const GURPS: any

  interface SettingConfig {
    'gurps.use-quintessence': any
    'gurps.sheet-navigation': any
  }

  interface DocumentClassConfig {
    Actor: typeof GurpsActor
    Item: typeof GurpsItem
  }

  interface FlagConfig {
    Actor: {
      gurps: {
        qnotes: boolean
      }
    }
  }
}

export {}
