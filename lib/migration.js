import { recurselist } from './utilities.js'
import * as Settings from './miscellaneous-settings.js'


export class Migration {

  static async migrateTo096() {
    let v = Settings.VERSION_096.toString()
    ui.notifications.info("Please wait, migrating Actors to v" + v)
    console.log("Migrating Actors to v" + v)
    for ( let actor of game.actors.entities ) {
      let commit = { "data.migrationversion" : v }
      for (const attr in actor.data.data.attributes) {
        if (actor.data.data.attributes[attr].import == null)
          commit = { ...commit, ...{ ['data.attributes.' + attr + '.import']: actor.data.data.attributes[attr].value || 1} }
      }
      recurselist(actor.data.data.skills, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.skills.' + k + '.import']: e.level || 1 } }
      })
      recurselist(actor.data.data.spells, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.spells.' + k + '.import']: e.level || 1 } }
      })
      recurselist(actor.data.data.melee, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.melee.' + k + '.import']: e.level || 1 } }
      })
      recurselist(actor.data.data.ranged, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.ranged.' + k + '.import']: e.level || 1} }
      })
      console.log("Updating " + actor.name)
      console.log(GURPS.objToString(commit))
      await actor.update(commit)
    }
    ui.notifications.info("Migration to v" + v + " complete!")
  }
  
  static async migrateTo097() {
    let v = Settings.VERSION_097.toString()
    ui.notifications.info("Please wait, migrating Actors to v" + v)
    console.log("Migrating Actors to v" + v)
    for ( let actor of game.actors.entities ) {
      let commit = { "data.migrationversion" : v }
       recurselist(actor.data.data.hitlocations, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.hitlocations.' + k + '.import']: e.dr } }
      })
      console.log("Updating " + actor.name)
      console.log(GURPS.objToString(commit))
      await actor.update(commit)
     }
    ui.notifications.info("Migration to v" + v + " complete!")
  }

}