import { zeroFill } from '../lib/utilities.js'
import * as settings from '../lib/miscellaneous-settings.js'

export const AddImportEquipmentButton = async function (html) {
  let button = $(
    '<button class="import-items"><i class="fas fa-file-import"></i>' +
    game.i18n.localize('GURPS.itemImport') +
    '</button>'
  )

  button.click(function () {
    setTimeout(async () => {
      new Dialog(
        {
          title: 'Import Item Compendium',
          // @ts-ignore
          content: await renderTemplate('systems/gurps/templates/item-import.html'),
          buttons: {
            import: {
              icon: '<i class="fas fa-file-import"></i>',
              label: 'Import',
              callback: html => {
                // @ts-ignore
                const form = html.find('form')[0]
                let files = form.data.files
                // @ts-ignore
                let file = null
                if (!files.length) {
                  // @ts-ignore
                  return ui.notifications.error('You did not upload a data file!')
                } else {
                  file = files[0]
                  console.log(file)
                  GURPS.readTextFromFile(file).then(text =>
                    ItemImporter.importItems(text, file.name.split('.').slice(0, -1).join('.'), file.path)
                  )
                }
              },
            },
            no: {
              icon: '<i class="fas fa-times"></i>',
              label: 'Cancel',
            },
          },
          default: 'import',
        },
        {
          width: 400,
        }
      ).render(true)
    }, 200)
  })

  html.find('.directory-footer').append(button)

}

export class ItemImporter {
  constructor() {
    this.count = 0
  }

  static async importItems(text, filename, filepath) {
    let importer = new ItemImporter()
    importer._importItems(text, filename, filepath)
  }

  async _importItems(text, filename, filepath) {
    let j = {}
    try {
      j = JSON.parse(text)
    } catch {
      return ui.notifications.error('The file you uploaded was not of the right format!')
    }

    if ([5].includes(j.version)) {
      // Version 5 does not have a type field ... find some other way to validate the data.
      // Verify that the contained objects has an 'equipped' field.
      if (j.rows[0].hasOwnProperty('quantity') === false) {
        return ui.notifications.error('The file you uploaded is not a GCS Equipment Library!')
      }
    } else if ([2, 4].includes(j.version)) {
      if (j.type !== 'equipment_list') {
        return ui.notifications.error('The file you uploaded is not a GCS Equipment Library!')
      }
    } else {
      return ui.notifications.error('The file you uploaded is not of the right version!')
    }

    const compendiumName = filename.replace(/ /g, '_')
    let pack = game.packs.find(p => p.metadata.name === compendiumName)
    if (!pack)
      pack = await CompendiumCollection.createCompendium({
        type: 'Item',
        label: filename,
        name: compendiumName,
        package: 'world',
      })
    let timestamp = new Date()
    ui.notifications.info('Importing Items from ' + filename + '...')
    for (let i of j.rows) {
      await this._importItem(i, pack, compendiumName, timestamp)
    }
    ui.notifications.info('Finished Importing ' + this.count + ' Items!')
  }

  _getItemCost(i) {
    if (!game.settings.get(settings.SYSTEM_NAME, settings.SETTING_IMPORT_EXTENDED_VALUES_GCS)) {
      return !!i.value ? parseFloat(i.value) || 0 : 0
    }
    let value
    if (!!i.calc?.extended_value) value = parseFloat(i.calc.extended_value)
    if (!value) value = parseFloat(i.value) || 0
    return value
  }

  _getItemWeight(i) {
    if (!game.settings.get(settings.SYSTEM_NAME, settings.SETTING_IMPORT_EXTENDED_VALUES_GCS)) {
      return !!i.weight ? parseFloat(i.weight) || 0 : 0
    }
    let weight
    if (!!i.calc?.extended_weight) weight = parseFloat(i.calc.extended_weight)
    if (!weight) weight = parseFloat(i.weight) || 0
    return weight
  }

  async _importItem(i, pack, filename, timestamp) {
    this.count++
    if (i.children?.length)
      for (let ch of i.children) {
        await this._importItem(ch, pack, filename, timestamp)
      }
    let itemData = {
      name: i.description,
      type: 'equipment',
      system: {
        eqt: {
          name: i.description,
          originalName: i.description,
          notes: i.notes,
          pageref: i.reference,
          count: i.quantity,
          cost: this._getItemCost(i),
          weight: this._getItemWeight(i),
          carried: true,
          equipped: true,
          techlevel: i.tech_level || '',
          categories: i.categories || '',
          legalityclass: i.legality_class || '',
          costsum: !!i.value ? parseFloat(i.value) : 0,
          weightsum: !!i.weight ? parseFloat(i.weight) : 0,
          uses: !!i.max_uses ? i.max_uses.toString() : '',
          maxuses: !!i.max_uses ? i.max_uses.toString() : 0,
          last_import: timestamp,
          uuid: i.id,
        },
        melee: {},
        ranged: {},
        bonuses: '',
        equipped: true,
        carried: true,
      },
    }
    if (i.weapons?.length)
      for (let w of i.weapons) {
        let otf_list = []
        if (w.defaults)
          for (let d of w.defaults) {
            let mod = !!d.modifier ? (d.modifier > -1 ? `+${d.modifier}` : d.modifier.toString()) : ''
            if (d.type === 'skill') {
              //otf_list.push(`S:${d.name.replace(/ /g, "*")}` + (d.specialization ? `*(${d.specialization.replace(/ /g, "*")})` : "") + mod);
              otf_list.push(`S:"${d.name}` + (d.specialization ? `*(${d.specialization})` : '') + '"' + mod)
            } else if (
              [
                '10',
                'st',
                'dx',
                'iq',
                'ht',
                'per',
                'will',
                'vision',
                'hearing',
                'taste_smell',
                'touch',
                'parry',
                'block',
              ].includes(d.type)
            ) {
              otf_list.push(d.type.replace('_', ' ') + mod)
            }
          }
        if (this.isMeleeWeapon(w)) {
          let wep = {
            block: w.block || '',
            damage: w.calc?.damage || '',
            mode: w.usage || '',
            name: itemData.name,
            notes: itemData.system.eqt.notes || '',
            pageref: itemData.system.eqt.pageref || '',
            parry: w.parry || '',
            reach: w.reach || '',
            st: w.strength || '',
            otf: otf_list.join('|') || '',
          }
          itemData.system.melee[zeroFill(Object.keys(itemData.system.melee).length + 1)] = wep
        } else if (this.isRangedWeapon(w)) {
          let wep = {
            acc: w.accuracy || '',
            ammo: '',
            bulk: w.bulk || '',
            damage: w.calc?.damage || '',
            mode: w.usage,
            name: itemData.name,
            notes: itemData.system.eqt.notes || '',
            pageref: itemData.system.eqt.pageref || '',
            range: w.range,
            rcl: w.recoil,
            rof: w.rate_of_fire,
            shots: w.shots,
            st: w.strength,
            otf: otf_list.join('|') || '',
          }
          itemData.system.ranged[zeroFill(Object.keys(itemData.system.ranged).length + 1)] = wep
        }
      }
    let bonus_list = []
    let feat_list = []
    if (i.features?.length)
      for (let f of i.features) {
        feat_list.push(f)
      }
    if (i.modifiers?.length)
      for (let m of i.modifiers) {
        if (!m.disabled && m.features?.length)
          for (let f of m.features) {
            feat_list.push(f)
          }
      }
    if (feat_list.length)
      for (let f of feat_list) {
        let bonus = f.amount ? (f.amount > -1 ? `+${f.amount}` : f.amount.toString()) : ''
        if (f.type === 'attribute_bonus') {
          bonus_list.push(`${f.attribute} ${bonus}`)
        } else if (f.type === 'dr_bonus') {
          const locations = f.locations.map(loc => {
            // If the string contains embedded spaces, wrap it in double quotes.
            if (/\s+/.test(loc)) {
              return `"*${loc}"`
            } else {
              return `*${loc}`
            }
          })

          if (!!locations.length > 0) {
            bonus_list.push(`DR ${bonus} ${locations.join(' ')}`)
          } else {
            bonus_list.push(`DR ${bonus}`)
          }
        } else if (f.type === 'skill_bonus') {
          if (f.selection_type === 'skills_with_name' && f.name?.compare === 'is') {
            if (f.specialization?.compare === 'is') {
              bonus_list.push(
                `A:${(f.name.qualifier || '').replace(/ /g, '*')}${(f.specialization.qualifier || '').replace(
                  / /g,
                  '*'
                )} ${bonus}`
              )
            } else if (!f.specialization) {
              bonus_list.push(`A:${(f.name.qualifier || '').replace(/ /g, '*')} ${bonus}`)
            }
          } else if (f.selection_type === 'weapons_with_name' && f.name?.compare === 'is') {
            if (f.specialization?.compare === 'is') {
              bonus_list.push(
                `A:${(f.name.qualifier || '').replace(/ /g, '*')}${(f.specialization.qualifier || '').replace(
                  / /g,
                  '*'
                )} ${bonus}`
              )
            } else if (!f.specialization) {
              bonus_list.push(`A:${(f.name.qualifier || '').replace(/ /g, '*')} ${bonus}`)
            }
          } else if (f.selection_type === 'this_weapon') {
            bonus_list.push(`A:${itemData.name.replace(/ /g, '*')} ${bonus}`)
          }
        } else if (f.type === 'spell_bonus') {
          if (f.match === 'spell_name' && f.name?.compare === 'is') {
            bonus_list.push(`S:${(f.name.qualifier || '').replace(/ /g, '*')} ${bonus}`)
          }
        } else if (f.type === 'weapon_bonus') {
          if (f.selection_type === 'weapons_with_name') {
            if (f.specialization?.compare === 'is') {
              bonus_list.push(
                `D:${(f.name?.qualifier || '').replace(/ /g, '*')}${(f.specialization.qualifier || '').replace(
                  / /g,
                  '*'
                )} ${bonus}`
              )
            } else if (!f.specialization) {
              bonus_list.push(`D:${(f.name?.qualifier || '').replace(/ /g, '*')} ${bonus}`)
            }
          } else if (f.selection_type === 'this_weapon') {
            bonus_list.push(`D:${itemData.name.replace(/ /g, '*')} ${bonus}`)
          }
        }
      }
    itemData.system.bonuses = bonus_list.join('\n')
    const cachedItems = []
    for (let i of pack.index) {
      cachedItems.push(await pack.getDocument(i._id))
    }
    let oi = await cachedItems.find(p => p.system.eqt.uuid === itemData.system.eqt.uuid)
    if (!!oi) {
      let oldData = foundry.utils.duplicate(oi)
      let newData = foundry.utils.duplicate(itemData)
      delete oldData.system.eqt.uuid
      delete newData.system.eqt.uuid
      if (oldData != newData) {
        return oi.update(newData)
      }
    } else {
      return Item.create(itemData, { pack: `world.${filename}` })
    }
  }

  isRangedWeapon(w) {
    return w.hasOwnProperty('range')
  }

  isMeleeWeapon(w) {
    return !this.isRangedWeapon(w)
  }
}
