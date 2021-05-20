import { recurselist } from './utilities.js'
import * as Settings from './miscellaneous-settings.js'


export class Migration {

  static async migrateTo096() {
    ui.notifications.info("Please wait, migrating Actors to v0.9.6")
    console.log("Migrating Actors to v0.9.6")
    for ( let actor of game.actors.entities ) {
      let commit = { "data.migrationversion" : '0.9.6' }
      for (const attr in actor.data.data.attributes) {
        if (actor.data.data.attributes[attr].import == null)
          commit = { ...commit, ...{ ['data.attributes.' + attr + '.import']: actor.data.data.attributes[attr].value } }
      }
      recurselist(actor.data.data.skills, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.skills.' + k + '.import']: e.level || 1 } }
      })
      recurselist(actor.data.data.spells, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.spells.' + k + '.import']: e.level | 1 } }
      })
      recurselist(actor.data.data.melee, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.melee.' + k + '.import']: e.level | 1 } }
      })
      recurselist(actor.data.data.ranged, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.ranged.' + k + '.import']: e.level | 1} }
      })
      // We must delay the upgrade of older actor's 'import' keys, since upon startup, the actor may not know which collection it belongs to
      if (Object.keys(commit).length > 0) {
        console.log("Updating " + actor.name)
        console.log(GURPS.objToString(commit))
        await actor.update(commit)
      }
    }
    ui.notifications.info("Migration to v0.9.6 complete!")
    game.settings.set(Settings.SYSTEM_NAME, Settings.SETTING_MIGRATION_VERSION, '0.9.6') 
  }
}