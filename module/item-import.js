import * as Settings from '../lib/miscellaneous-settings.js'
import { zeroFill } from '../lib/utilities.js'

export const AddImportEquipmentButton = async function (html) {
  const button = document.createElement('button')
  button.classList.add('import-items')
  button.addEventListener('click', async () => {
    new foundry.applications.api.DialogV2({
      window: {
        title: game.i18n.localize('GURPS.itemImport'),
      },
      content: await renderTemplate('systems/gurps/templates/item-import.hbs'),
      buttons: [
        {
          action: 'import',
          label: game.i18n.localize('GURPS.import'),
          icon: 'fa-solid fa-file-import',
          default: true,
          callback: async (html, button, dialog) => {
            const files = button.form.elements.data.files
            if (!files.length) {
              return ui.notifications.error(game.i18n.localize('GURPS.noFile'))
            } else {
              const file = files[0]
              console.log(file)
              GURPS.readTextFromFile(file).then(text =>
                ItemImporter.importItems(text, file.name.split('.').slice(0, -1).join('.'), file.path)
              )
            }
          },
        },
        {
          action: 'cancel',
          label: game.i18n.localize('GURPS.cancel'),
          icon: 'fa-solid fa-times',
          callback: () => undefined, // Resolve with undefined if cancelled
        },
      ],
    }).render({ force: true })
  })

  const icon = document.createElement('i')
  icon.classList.add('fa-solid', 'fa-file-import')
  button.appendChild(icon)
  const textNode = document.createTextNode(game.i18n.localize('GURPS.itemImport'))
  button.appendChild(textNode)

  if (game.release.generation === 12) {
    html = html[0]
    html.querySelector('.directory-footer').append(button)
  } else {
    html.querySelector('.header-actions').append(button)
  }
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
    if (!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_IMPORT_EXTENDED_VALUES_GCS)) {
      return this._getCostValue(i)
    }

    let value
    if (!!i.calc?.extended_value) value = parseFloat(i.calc.extended_value)
    if (!value) value = this._getCostValue(i)
    return value
  }

  _getCostValue(i) {
    return parseFloat(i.calc.value ?? i.value) || 0
  }

  _getItemWeight(i) {
    if (!game.settings.get(Settings.SYSTEM_NAME, Settings.SETTING_IMPORT_EXTENDED_VALUES_GCS)) {
      return this._getWeightValue(i)
    }

    let weight
    if (!!i.calc?.extended_weight) weight = parseFloat(i.calc.extended_weight)
    if (!weight) weight = this._getWeightValue(i)
    return weight
  }

  _getWeightValue(i) {
    return parseFloat(i.calc?.weight ?? i.weight) || 0
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
            let clonedFeature = { ...f, modifier: true }
            feat_list.push(clonedFeature)
          }
      }
    if (feat_list.length)
      for (let f of feat_list) {
        let bonus = f.amount ? (f.amount > -1 ? `+${f.amount}` : f.amount.toString()) : ''
        if (f.type === 'attribute_bonus') {
          bonus_list.push(`${f.attribute} ${bonus}`)
        } else if (f.type === 'dr_bonus') {
          let locations = []
          // Handle modifiers like "Fortify" that don't have locations, but are applied to "this armor". In that case,
          // we create a DR bonus that applies to all locations that the other DR bonuses apply to.
          if (f.modifier && (!f.locations || f.locations.length === 0)) {
            locations.push(
              bonus_list
                .filter(b => b.startsWith('DR ')) // This will get all the DR entries in the bonus list
                .map(b => this._getTextAfterNthSpace(b, 2)) // This gets the locations part
                .join(' ')
            )
          } else {
            locations = f.locations.map(loc => this._formatLocation(loc))
          }

          if (locations.length > 0) {
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

  _getTextAfterNthSpace(text, number) {
    const parts = text.split(' ')
    if (parts.length <= number) return ''
    return parts.slice(number).join(' ')
  }

  _formatLocation(text) {
    return /\s+/.test(text) ? `"*${text}"` : `*${text}`
  }

  isRangedWeapon(w) {
    return w.hasOwnProperty('range')
  }

  isMeleeWeapon(w) {
    return !this.isRangedWeapon(w)
  }
}
