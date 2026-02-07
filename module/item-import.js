import { zeroFill } from '../lib/utilities.js'

import { ImportSettings } from './importer/index.js'

export const AddImportEquipmentButton = async function (html) {
  const button = document.createElement('button')

  button.classList.add('import-items')
  button.addEventListener('click', async () => {
    new foundry.applications.api.DialogV2({
      window: {
        title: game.i18n.localize('GURPS.itemImport'),
      },
      content: await foundry.applications.handlebars.renderTemplate('systems/gurps/templates/item-import.hbs'),
      buttons: [
        {
          action: 'import',
          label: game.i18n.localize('GURPS.import'),
          icon: 'fa-solid fa-file-import',
          default: true,
          callback: async (_html, button) => {
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

  static async importItems(text, filename) {
    let importer = new ItemImporter()

    importer._importItems(text, filename)
  }

  async _importItems(text, filename) {
    let jsonData = {}

    try {
      jsonData = JSON.parse(text)
    } catch {
      return ui.notifications.error('The file you uploaded was not of the right format!')
    }

    if ([5].includes(jsonData.version)) {
      // Version 5 does not have a type field ... find some other way to validate the data.
      // Verify that the contained objects has an 'equipped' field.
      if (Object.hasOwn(jsonData.rows[0], 'quantity') === false) {
        return ui.notifications.error('The file you uploaded is not a GCS Equipment Library!')
      }
    } else if ([2, 4].includes(jsonData.version)) {
      if (jsonData.type !== 'equipment_list') {
        return ui.notifications.error('The file you uploaded is not a GCS Equipment Library!')
      }
    } else {
      return ui.notifications.error('The file you uploaded is not of the right version!')
    }

    const compendiumName = filename.replace(/ /g, '_')
    let pack = game.packs.find(pack => pack.metadata.name === compendiumName)

    if (!pack)
      pack = await CompendiumCollection.createCompendium({
        type: 'Item',
        label: filename,
        name: compendiumName,
        package: 'world',
      })
    let timestamp = new Date()

    ui.notifications.info('Importing Items from ' + filename + '...')

    for (let i of jsonData.rows) {
      await this._importItem(i, pack, compendiumName, timestamp)
    }

    ui.notifications.info('Finished Importing ' + this.count + ' Items!')
  }

  _getItemCost(i) {
    if (!ImportSettings.importExtendedValues) {
      return this._getCostValue(i)
    }

    let value

    if (i.calc?.extended_value) value = parseFloat(i.calc.extended_value)
    if (!value) value = this._getCostValue(i)

    return value
  }

  _getCostValue(i) {
    return parseFloat(i.calc.value ?? i.value) || 0
  }

  _getItemWeight(i) {
    if (!ImportSettings.importExtendedValues) {
      return this._getWeightValue(i)
    }

    let weight

    if (i.calc?.extended_weight) weight = parseFloat(i.calc.extended_weight)
    if (!weight) weight = this._getWeightValue(i)

    return weight
  }

  _getWeightValue(i) {
    return parseFloat(i.calc?.weight ?? i.weight) || 0
  }

  async _importItem(i, pack, filename, timestamp) {
    console.log('Importing Item: ', i.description)
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
          costsum: i.value ? parseFloat(i.value) : 0,
          weightsum: i.weight ? parseFloat(i.weight) : 0,
          uses: i.max_uses ? i.max_uses.toString() : '',
          maxuses: i.max_uses ? i.max_uses.toString() : 0,
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
      for (let weapon of i.weapons) {
        let otf_list = []

        if (weapon.defaults)
          for (let def of weapon.defaults) {
            let mod = def.modifier ? (def.modifier > -1 ? `+${def.modifier}` : def.modifier.toString()) : ''

            if (def.type === 'skill') {
              //otf_list.push(`S:${def.name.replace(/ /g, "*")}` + (def.specialization ? `*(${def.specialization.replace(/ /g, "*")})` : "") + mod);
              otf_list.push(`S:"${def.name}` + (def.specialization ? `*(${def.specialization})` : '') + '"' + mod)
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
              ].includes(def.type)
            ) {
              otf_list.push(def.type.replace('_', ' ') + mod)
            }
          }

        if (this.isMeleeWeapon(weapon)) {
          let wep = {
            block: weapon.block || '',
            damage: weapon.calc?.damage || '',
            mode: weapon.usage || '',
            name: itemData.name,
            notes: itemData.system.eqt.notes || '',
            pageref: itemData.system.eqt.pageref || '',
            parry: weapon.parry || '',
            reach: weapon.reach || '',
            st: weapon.strength || '',
            otf: otf_list.join('|') || '',
          }

          itemData.system.melee[zeroFill(Object.keys(itemData.system.melee).length + 1)] = wep
        } else if (this.isRangedWeapon(weapon)) {
          let wep = {
            acc: weapon.accuracy || '',
            ammo: '',
            bulk: weapon.bulk || '',
            damage: weapon.calc?.damage || '',
            mode: weapon.usage,
            name: itemData.name,
            notes: itemData.system.eqt.notes || '',
            pageref: itemData.system.eqt.pageref || '',
            range: weapon.range,
            rcl: weapon.recoil,
            rof: weapon.rate_of_fire,
            shots: weapon.shots,
            st: weapon.strength,
            otf: otf_list.join('|') || '',
          }

          itemData.system.ranged[zeroFill(Object.keys(itemData.system.ranged).length + 1)] = wep
        }
      }

    let bonus_list = []
    let feat_list = []

    if (i.features?.length)
      for (let feature of i.features) {
        feat_list.push(feature)
      }

    if (i.modifiers?.length)
      for (let mod of i.modifiers) {
        if (!mod.disabled && mod.features?.length)
          for (let feature of mod.features) {
            let clonedFeature = { ...feature, modifier: true }

            feat_list.push(clonedFeature)
          }
      }

    if (feat_list.length)
      for (let feature of feat_list) {
        let bonus = feature.amount ? (feature.amount > -1 ? `+${feature.amount}` : feature.amount.toString()) : ''

        if (feature.type === 'attribute_bonus') {
          bonus_list.push(`${feature.attribute} ${bonus}`)
        } else if (feature.type === 'dr_bonus') {
          let locations = []

          // Handle modifiers like "Fortify" that don't have locations, but are applied to "this armor". In that case,
          // we create a DR bonus that applies to all locations that the other DR bonuses apply to.
          if (feature.modifier && (!feature.locations || feature.locations.length === 0)) {
            locations.push(
              bonus_list
                .filter(bonus => bonus.startsWith('DR ')) // This will get all the DR entries in the bonus list
                .map(bonus => this._getTextAfterNthSpace(bonus, 2)) // This gets the locations part
                .join(' ')
            )
          } else {
            locations = feature.locations.map(loc => this._formatLocation(loc))
          }

          if (locations.length > 0) {
            bonus_list.push(`DR ${bonus} ${locations.join(' ')}`)
          } else {
            bonus_list.push(`DR ${bonus}`)
          }
        } else if (feature.type === 'skill_bonus') {
          if (feature.selection_type === 'skills_with_name' && feature.name?.compare === 'is') {
            if (feature.specialization?.compare === 'is') {
              bonus_list.push(
                `A:${(feature.name.qualifier || '').replace(/ /g, '*')}${(
                  feature.specialization.qualifier || ''
                ).replace(/ /g, '*')} ${bonus}`
              )
            } else if (!feature.specialization) {
              bonus_list.push(`A:${(feature.name.qualifier || '').replace(/ /g, '*')} ${bonus}`)
            }
          } else if (feature.selection_type === 'weapons_with_name' && feature.name?.compare === 'is') {
            if (feature.specialization?.compare === 'is') {
              bonus_list.push(
                `A:${(feature.name.qualifier || '').replace(/ /g, '*')}${(
                  feature.specialization.qualifier || ''
                ).replace(/ /g, '*')} ${bonus}`
              )
            } else if (!feature.specialization) {
              bonus_list.push(`A:${(feature.name.qualifier || '').replace(/ /g, '*')} ${bonus}`)
            }
          } else if (feature.selection_type === 'this_weapon') {
            bonus_list.push(`A:${itemData.name.replace(/ /g, '*')} ${bonus}`)
          }
        } else if (feature.type === 'spell_bonus') {
          if (feature.match === 'spell_name' && feature.name?.compare === 'is') {
            bonus_list.push(`S:${(feature.name.qualifier || '').replace(/ /g, '*')} ${bonus}`)
          }
        } else if (feature.type === 'weapon_bonus') {
          if (feature.selection_type === 'weapons_with_name') {
            if (feature.specialization?.compare === 'is') {
              bonus_list.push(
                `D:${(feature.name?.qualifier || '').replace(/ /g, '*')}${(
                  feature.specialization.qualifier || ''
                ).replace(/ /g, '*')} ${bonus}`
              )
            } else if (!feature.specialization) {
              bonus_list.push(`D:${(feature.name?.qualifier || '').replace(/ /g, '*')} ${bonus}`)
            }
          } else if (feature.selection_type === 'this_weapon') {
            bonus_list.push(`D:${itemData.name.replace(/ /g, '*')} ${bonus}`)
          }
        }
      }

    itemData.system.bonuses = bonus_list.join('\n')
    const cachedItems = []

    for (let i of pack.index) {
      cachedItems.push(await pack.getDocument(i._id))
    }

    let oi = await cachedItems.find(cachedItem => cachedItem.system.eqt.uuid === itemData.system.eqt.uuid)

    if (oi) {
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

  isRangedWeapon(weapon) {
    return Object.hasOwn(weapon, 'range')
  }

  isMeleeWeapon(weapon) {
    return !this.isRangedWeapon(weapon)
  }
}
