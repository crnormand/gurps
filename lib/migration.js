import { recurselist } from './utilities.js'
import * as Settings from './miscellaneous-settings.js'
import Maneuvers from '../module/actor/maneuver.js'
import { asGurpsActor, _game, _GURPS, _ui } from '../module/global-references.js'

export class Migration {
  static async migrateTo096(quiet = false) {
    let v = Settings.VERSION_096?.toString()
    if (!quiet) _ui().notifications?.info('Please wait, migrating Actors to v' + v)
    console.log('Migrating Actors to v' + v)

    for (let actor of _game().actors?.contents || []) {
      let commit = { 'data.migrationversion': v }

      let data = asGurpsActor(actor).getGurpsActorData()
      for (const attr in data.attributes) {
        if (data.attributes[attr].import == null)
          commit = {
            ...commit,
            ...{ ['data.attributes.' + attr + '.import']: data.attributes[attr].value || 1 },
          }
      }

      recurselist(data.skills, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.skills.' + k + '.import']: e.level || 1 } }
      })

      recurselist(data.spells, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.spells.' + k + '.import']: e.level || 1 } }
      })

      recurselist(data.melee, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.melee.' + k + '.import']: e.level || 1 } }
      })

      recurselist(data.ranged, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.ranged.' + k + '.import']: e.level || 1 } }
      })

      console.log('Updating ' + actor.name)
      console.log(_GURPS().objToString(commit))
      await actor.update(commit)
    }
    if (!quiet) _ui().notifications?.info('Migration to v' + v + ' complete!')
  }

  /**
   * @param {boolean | undefined} [quiet]
   */
  static async migrateTo097(quiet) {
    let v = Settings.VERSION_097?.toString()
    if (!quiet) _ui().notifications?.info('Please wait, migrating Actors to v' + v)
    console.log('Migrating Actors to v' + v)
    for (let actor of _game().actors?.contents || []) {
      let commit = { 'data.migrationversion': v }
      let data = asGurpsActor(actor).getGurpsActorData()

      recurselist(data.hitlocations, (e, k, d) => {
        if (e.import == null) commit = { ...commit, ...{ ['data.hitlocations.' + k + '.import']: e.dr } }
      })
      console.log('Updating ' + actor.name)
      console.log(_GURPS().objToString(commit))
      await actor.update(commit)
    }
    if (!quiet) _ui().notifications?.info('Migration to v' + v + ' complete!')
  }

  /**
   * @param {boolean | undefined} [quiet]
   */
  static async migrateTo0104(quiet) {
    let v = Settings.VERSION_0104?.toString()
    if (!quiet) _ui().notifications?.info('Please wait, migrating Tokens to v' + v)
    console.log('Migrating Tokens to v' + v)
    for (const scene of _game().scenes?.contents || []) {
      // @ts-ignore
      for (const tokendoc of scene.tokens.contents) {
        let actor = tokendoc.actor
        if (!!actor)
          // data protect against bad tokens
          for (const effect of actor.temporaryEffects) {
            let orig = effect.data.icon

            // Do not migrate maneuver icons until/unless we get .webp versions
            if (Maneuvers.isManeuverIcon(orig)) {
              continue
            }

            let icon = orig.replace('.jpg', '.webp').replace('.png', '.webp')
            console.log(actor.name + ':' + effect.data.label + ' ' + orig + ' -> ' + icon)
            await actor.updateEmbeddedDocuments('ActiveEffect', [{ _id: effect.id, icon: icon }])
          }
      }
    }
    if (!quiet) _ui().notifications?.info('Migration to v' + v + ' complete!')
  }

  /**
   * @param {boolean} quiet
   */
  static async migrateToManeuvers(quiet) {
    if (_game().user?.isGM) {
      if (!quiet) _ui().notifications?.info('Please wait, migrating tokens to use maneuvers.')

      for (const scene of _game().scenes?.contents || []) {
        // @ts-ignore
        for (const tokendoc of scene.tokens.contents) {
          if (tokendoc.actor) {
            let maneuverText = tokendoc.actor.data.data.conditions.maneuver
            await tokendoc.object.setManeuver(maneuverText)
            tokendoc.object.drawEffects()
          }
        }
      }

      if (!quiet) _ui().notifications?.info('Migration to maneuvers complete.')
    }
  }
}
