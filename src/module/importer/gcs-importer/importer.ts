import { DataModel } from '@gurps-types/foundry/index.js'
import { parseBlock, parseParry } from '@module/action/parse-attack.js'
import { MoveModeV2 } from '@module/actor/data/move-mode.js'
import { NoteV2Schema } from '@module/actor/data/note.js'
import { BaseItemModel } from '@module/item/data/base.js'
import { TraitSchema } from '@module/item/data/trait.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

import { MeleeAttackSchema } from '../../action/melee-attack.js'
import { RangedAttackSchema } from '../../action/ranged-attack.js'
import { CharacterSchema } from '../../actor/data/character.js'
import { HitLocationSchemaV2 } from '../../actor/data/hit-location-entry.js'
import { ActorType } from '../../actor/types.js'
import { hitlocationDictionary } from '../../hitlocation/hitlocation.js'
import { EquipmentSchema } from '../../item/data/equipment.js'
import { SkillSchema } from '../../item/data/skill.js'
import { SpellSchema } from '../../item/data/spell.js'
import { ItemType } from '../../item/types.js'
import { createDataIsOfType, createStandardTrackers, promptDeletionOfMigratedItems } from '../helpers.js'
import { ImportSettings } from '../index.js'

import { GcsCollection } from './schema/base.js'
import { GcsCharacter } from './schema/character.js'
import { GcsEquipment } from './schema/equipment.js'
import { AnyGcsItem, AnyGcsItemCollection } from './schema/index.js'
import { GcsNote } from './schema/note.js'
import { GcsSkill } from './schema/skill.js'
import { GcsSpell } from './schema/spell.js'
import { GcsTrait } from './schema/trait.js'
import { GcsWeapon } from './schema/weapon.js'

enum GcsImporterMode {
  Character = 'character',
  ItemCompendium = 'itemCompendium',
}

enum GcsItemCollectionType {
  Trait = 'trait',
  Skill = 'skill',
  Spell = 'spell',
  Equipment = 'equipment',
}

const _GcsItemConstructorMap = {
  [GcsItemCollectionType.Trait]: GcsTrait,
  [GcsItemCollectionType.Skill]: GcsSkill,
  [GcsItemCollectionType.Spell]: GcsSpell,
  [GcsItemCollectionType.Equipment]: GcsEquipment,
}

/* ---------------------------------------- */

type GcsItemCollectionOfType<Type extends GcsItemCollectionType> = GcsCollection<(typeof _GcsItemConstructorMap)[Type]>

type GcsImporterInputType<Mode extends GcsImporterMode> = Mode extends 'character' ? GcsCharacter : AnyGcsItemCollection

/* ---------------------------------------- */

/**
 * GCS Importer class for importing GCS characters into the system.
 * This class handles the conversion of GCS character data into the format used by the GURPS system.
 */
class GcsImporter<Mode extends GcsImporterMode> {
  _mode: Mode
  input: GcsImporterInputType<Mode>
  actor?: Actor.OfType<ActorType.Character>
  output: DataModel.CreateData<CharacterSchema> = {}
  items: Item.CreateData[]
  existingItems: Item.Stored[]
  img: string

  /* ---------------------------------------- */

  constructor(options: { input: GcsImporterInputType<Mode>; mode: Mode }) {
    this._mode = options.mode
    this.input = options.input
    this.output = {}
    this.existingItems = []

    this.items = []
    this.img = ''
  }

  /* ---------------------------------------- */

  /**
   * Given a GCS Character, create a (new) GURPS Actor.
   * @param input GCS Character data
   */
  static async importCharacter(
    input: GcsCharacter,
    actor?: Actor.OfType<ActorType.Character>
  ): Promise<Actor.OfType<ActorType.Character>> {
    return await new GcsImporter({ input, mode: GcsImporterMode.Character }).#importCharacter(actor)
  }

  /* ---------------------------------------- */

  static async importItemCompendium(input: AnyGcsItemCollection) {
    return await new GcsImporter({ input, mode: GcsImporterMode.ItemCompendium }).#importItemCompendium()
  }

  /* ---------------------------------------- */

  _isMode<T extends GcsImporterMode>(mode: T): this is { _mode: T; input: GcsImporterInputType<T> }
  _isMode(mode: string): boolean {
    return this._mode === mode
  }

  /* ---------------------------------------- */

  async #importCharacter(actor?: Actor.OfType<ActorType.Character>): Promise<Actor.OfType<ActorType.Character>> {
    if (!this._isMode(GcsImporterMode.Character))
      return Promise.reject(new Error('GcsImporter: Invalid mode for character import.'))

    const _id = actor ? actor._id : foundry.utils.randomID()
    const type = ActorType.Character

    const importedName = this.input.profile.name ?? game.i18n!.localize('GURPS.importer.defaultName')
    const name = ImportSettings.overwriteName ? importedName : (actor?.name ?? importedName)

    // Set actor as a GcsImporter property for easier reference.
    if (actor) {
      this.actor = actor
      this.existingItems = actor.items.contents
    }

    this.#importPortrait()
    await this.#importAttributes()
    this.#importProfile()
    await this.#importHitLocations()
    this.#importItems()
    this.#importPointTotals()
    this.#importMiscValues()
    this.#importNotes()
    await promptDeletionOfMigratedItems(this.actor)
    createStandardTrackers(this)

    if (actor) {
      // When importing into existing actor, save count and uses for equipment with ignoreImportQty flag
      const savedEquipmentCounts = this.#saveEquipmentCountsIfNecessary(
        actor.items.contents.filter(item => item.isOfType(ItemType.Equipment))
      )

      // Update actor with new system data and create new items
      await actor.update({
        name,
        img: this.img,
        system: this.output,
      })

      // Restore saved counts and uses in raw item data before creating embedded documents
      this.#restoreEquipmentCountsAndUses(savedEquipmentCounts)

      await this.#deleteImportedItems(actor)

      this.existingItems = actor.items.contents

      const itemsToUpdate = this.items.filter(itemData => this.#existingItemId(itemData))
      const itemsToCreate = this.items.filter(itemData => !this.#existingItemId(itemData))

      await actor.updateEmbeddedDocuments('Item', itemsToUpdate, { recursive: false })
      await actor.createEmbeddedDocuments('Item', itemsToCreate, { keepId: true })
    } else {
      // @ts-expect-error: Actor shows as stored type, but is not stored.
      actor = await Actor.create({
        _id,
        name,
        type,
        img: this.img,
        system: this.output,
        items: this.items,
      })
    }

    if (!actor) {
      throw new Error('Failed to create GURPS actor during import.')
    }

    ui.notifications?.info(game.i18n!.format('GURPS.importer.actor.successMessage', { name }))

    return actor
  }

  /* ---------------------------------------- */

  #itemCollectionIsOfType<Type extends GcsItemCollectionType>(
    collection: GcsCollection,
    type: Type
  ): collection is GcsItemCollectionOfType<Type>
  #itemCollectionIsOfType(collection: GcsCollection, type: string): boolean {
    return collection.type === type
  }

  /* ---------------------------------------- */

  /**
   * Removes any items on the actor imported from an external program.
   * This function does not discriminate between GCS or GCA imported items,
   * as there could theoretically be cases in which items are imported from GCA,
   * then from GCS, or vice versa. Not sure why anyone would do that, but we're accounting
   * for it here.
   *
   * @param actor - The affected actor
   */
  async #deleteImportedItems(actor: Actor.OfType<ActorType.Character>) {
    const importedItems = actor.items.filter(item => {
      const system = item.system as { importFrom: string }

      return ['GCS', 'GCA'].includes(system?.importFrom)
    })

    await actor.deleteEmbeddedDocuments(
      'Item',
      importedItems.map(i => i.id!)
    )
  }

  /* ---------------------------------------- */

  #existingItemId(itemData: Item.CreateData): string | null {
    const system = itemData.system as AnyObject
    const id = system?.importid

    if (!id) return null

    const existingId = this.existingItems.find(existing => existing.system.importid === id)?._id ?? null

    return existingId || null
  }

  /* ---------------------------------------- */

  async #importItemCompendium(): Promise<foundry.documents.collections.CompendiumCollection<'Item'> | null> {
    if (!this._isMode(GcsImporterMode.ItemCompendium))
      return Promise.reject(new Error('GcsImporter: Invalid mode for item compendium import.'))

    if (!game.packs) {
      console.error("GURPS | Foundry game.packs is undefined. Can't import compendium.")

      return null
    }

    const name = this.input.name.replace(/ /g, '_')

    let pack = game.packs.get(`world.${name}`) as foundry.documents.collections.CompendiumCollection<'Item'> | undefined

    if (pack) this.existingItems = await pack.getDocuments()

    if (this.#itemCollectionIsOfType(this.input, GcsItemCollectionType.Trait)) {
      this.input.rows.forEach((trait, index) => this.#importTrait(trait, index))
    } else if (this.#itemCollectionIsOfType(this.input, GcsItemCollectionType.Skill)) {
      this.input.rows.forEach((skill, index) => this.#importSkill(skill, index))
    } else if (this.#itemCollectionIsOfType(this.input, GcsItemCollectionType.Spell)) {
      this.input.rows.forEach((spell, index) => this.#importSpell(spell, index))
    } else if (this.#itemCollectionIsOfType(this.input, GcsItemCollectionType.Equipment)) {
      this.input.rows.forEach((equipment, index) => this.#importEquipment(equipment, index, true))
    } else {
      ui.notifications?.error?.('GcsImporter: Unsupported item collection type for compendium import.')

      return Promise.reject(new Error('GcsImporter: Unsupported item collection type for compendium import.'))
    }

    const itemsToCreate = this.items.filter(itemData => !this.#existingItemId(itemData))
    const itemsToUpdate = this.items.filter(itemData => this.#existingItemId(itemData))

    if (!pack) {
      pack = await foundry.documents.collections.CompendiumCollection.createCompendium({
        type: 'Item',
        label: this.input.name,
        // @ts-expect-error: this type is valid but fvtt-types thinks otherwise
        packageType: 'world',
        name,
      })
    }

    await foundry.documents.Item.createDocuments(itemsToCreate, { pack: pack.metadata.id })
    await foundry.documents.Item.updateDocuments(itemsToUpdate, { pack: pack.metadata.id })

    ui.notifications?.info(
      game.i18n!.format('GURPS.importer.item.successMessage', { name: this.input.name, num: `${this.items.length}` })
    )

    return pack
  }

  /* ---------------------------------------- */

  #restoreEquipmentCountsAndUses(savedEquipmentCounts: Map<string, { quantity: number; uses: number }>) {
    if (savedEquipmentCounts.size > 0) {
      for (const itemData of this.items) {
        if (createDataIsOfType(itemData, ItemType.Equipment)) {
          const system = itemData.system as DataModel.CreateData<EquipmentSchema>

          if (system && system.importid && savedEquipmentCounts.has(system.importid)) {
            system.count = savedEquipmentCounts.get(system.importid)!.quantity
            system.uses = savedEquipmentCounts.get(system.importid)!.uses
            system.ignoreImportQty = true
          }
        }
      }
    }
  }

  /* ---------------------------------------- */

  #saveEquipmentCountsIfNecessary(items: Item.OfType<ItemType.Equipment>[]) {
    const savedEquipmentCounts = new Map<string, { quantity: number; uses: number }>()

    items.forEach(item => {
      const system = item.system

      if (system && system.importFrom === 'GCS' && system.ignoreImportQty && system.importid) {
        savedEquipmentCounts.set(system.importid, { quantity: system.count, uses: system.uses })
      }
    })

    return savedEquipmentCounts
  }

  /* ---------------------------------------- */

  #importPortrait() {
    if (!this._isMode(GcsImporterMode.Character)) return

    if (this.actor) {
      // If actor exists, assume we're keeping the current portrait unless otherwise specified
      this.img = this.actor.img ?? ''
      const isDefaultImage = this.img === (this.actor.constructor as typeof Actor).DEFAULT_ICON

      if (!ImportSettings.overwritePortrait && !isDefaultImage) return
    }

    if (!game.user?.hasPermission('FILES_UPLOAD')) {
      ui.notifications?.warn(
        `User "${game.user?.name}" does not have permissions to upload a portrait to the user directory.
Portrait will not be imported.`
      )

      return
    }

    if (!this.input.profile.portrait) {
      // No portrait provided. Don't import.
      return
    }

    this.img = `data:image/png;base64,${this.input.profile.portrait}`
  }

  /* ---------------------------------------- */

  async #importAttributes() {
    if (!this._isMode(GcsImporterMode.Character)) return

    this.output.attributes = { ST: {}, DX: {}, IQ: {}, HT: {}, WILL: {}, PER: {}, QN: {} }

    for (const key of ['ST', 'DX', 'IQ', 'HT', 'QN', 'WILL', 'PER'] as const) {
      const attribute = this.input.attributes.find(attr => attr.attr_id === key.toLowerCase())

      this.output.attributes[key] = {
        import: attribute?.calc.value ?? 10,
        points: attribute?.calc.points ?? 0,
      }
    }

    const basicSpeed = this.input.attributes.find(attr => attr.attr_id === 'basic_speed')

    this.output.basicspeed = {
      value: basicSpeed?.calc.value ?? 5,
      points: basicSpeed?.calc.points ?? 0,
    }

    const basicMove = this.input.attributes.find(attr => attr.attr_id === 'basic_move')

    this.output.basicmove = {
      value: basicMove?.calc.value ?? 5,
      points: basicMove?.calc.points ?? 0,
    }

    for (const key of ['HP', 'FP', 'QP'] as const) {
      const attribute = this.input.attributes.find(attr => attr.attr_id === key.toLowerCase())

      if (attribute) {
        this.output[key] = {
          min: 0,
          max: attribute.calc.value,
          damage: attribute.damage,
          points: attribute.calc.points,
        }
      } else {
        this.output[key] = {
          min: 0,
          max: 10,
          damage: 0,
          points: 0,
        }
      }
    }

    const otherAttributeKeys = {
      frightcheck: 'fright_check',
      vision: 'vision',
      hearing: 'hearing',
      tastesmell: 'taste_smell',
      touch: 'touch',
    }

    for (const [gga, gcs] of Object.entries(otherAttributeKeys)) {
      const attribute = this.input.attributes.find(attr => attr.attr_id === gcs)

      if (attribute) {
        this.output[gga as 'frightcheck' | 'vision' | 'tastesmell' | 'touch'] = attribute.calc.value
      } else {
        this.output[gga as 'frightcheck' | 'vision' | 'tastesmell' | 'touch'] = 10
      }
    }

    this.output.thrust = this.input.calc.thrust
    this.output.swing = this.input.calc.swing
    this.output.dodge = { value: this.input.calc.dodge[0] ?? 0 }

    await this.#promptPointPoolOverwrite()
  }

  /* ---------------------------------------- */

  async #promptPointPoolOverwrite() {
    // No need to run this if there is no existing actor
    // or if this is the first import
    if (!this.actor || !this.actor.system.profile.modifiedon) return

    const currentHP = this.actor.system.HP.value
    const currentFP = this.actor.system.FP.value

    const newHP = (this.output.HP?.max ?? 0) - (this.output.HP?.damage ?? 0)
    const newFP = (this.output.FP?.max ?? 0) - (this.output.FP?.damage ?? 0)

    const statsDifference = currentHP !== newHP || currentFP !== newFP

    if (!statsDifference) return

    const automaticOverwrite = ImportSettings.overwriteHpAndFp

    if (automaticOverwrite === 'overwrite') return // Automatically overwrite from file

    if (automaticOverwrite === 'keep') {
      // Automatically ignore values from file
      this.output.HP!.damage = this.actor.system.HP.damage
      this.output.FP!.damage = this.actor.system.FP.damage

      return
    }

    // Defaulting to ask
    const overwriteOption: 'keep' | 'overwrite' | null = await foundry.applications.api.DialogV2.wait({
      window: {
        title: game.i18n!.localize('GURPS.importer.promptHPandFP.title'),
      },
      content: game.i18n!.format('GURPS.importer.promptHPandFP.content', {
        currentHP: `${currentHP}`,
        currentFP: `${currentFP}`,
        hp: `${newHP}`,
        fp: `${newFP}`,
      }),
      modal: true,
      buttons: [
        {
          action: 'keep',
          label: game.i18n!.localize('GURPS.dialog.keep'),
          icon: 'far fa-square',
          default: true,
        },
        {
          action: 'overwrite',
          label: game.i18n!.localize('GURPS.dialog.overwrite'),
          icon: 'fas fa-edit',
        },
      ],
    })

    if (overwriteOption === 'keep') {
      this.output.HP!.damage = this.actor.system.HP.damage
      this.output.FP!.damage = this.actor.system.FP.damage
    }
  }

  /* ---------------------------------------- */

  #importProfile() {
    if (!this._isMode(GcsImporterMode.Character)) return

    const { profile } = this.input

    this.output.profile = {
      title: profile.title ?? '',
      height: profile.height ?? '',
      weight: profile.weight ?? '',
      age: profile.age ?? '',
      birthday: profile.birthday ?? '',
      religion: profile.religion ?? '',
      gender: profile.gender ?? '',
      eyes: profile.eyes ?? '',
      hair: profile.hair ?? '',
      hand: profile.handedness ?? '',
      skin: profile.skin ?? '',
      sizemod: profile.SM ?? 0,
      techlevel: profile.tech_level ?? '',
      createdon: this.input.created_date ?? '',
      modifiedon: this.input.modified_date ?? '',
      player: profile.player_name ?? '',
    }
  }

  /* ---------------------------------------- */

  async #importHitLocations() {
    if (!this._isMode(GcsImporterMode.Character)) return

    this.output.bodyplan = this.input.settings.body_type.name ?? 'Humanoid'

    this.output.hitlocationsV2 = this.input.settings.body_type.locations.reduce(
      (acc: Record<string, DataModel.CreateData<HitLocationSchemaV2>>, location) => {
        const id = foundry.utils.randomID()

        const split = { ...(location.calc.dr as Record<string, number>) }

        delete split.all // Remove the 'all' key, as it is already present in the 'import' field

        // Try to determine the role of the hit location. This is used in the Damage Calculator to determine crippling
        // damage and other effects.
        const tempEntry = hitlocationDictionary![this.output.bodyplan!.toLowerCase()]
        const entry = Object.values(tempEntry).find((entry: any) => entry.id === location.id) as
          | { id?: string; role?: string }
          | undefined
        const role = entry?.role ?? entry?.id ?? ''

        const newLocation: DataModel.CreateData<HitLocationSchemaV2> = {
          _id: id,
          where: location.table_name ?? '',
          import: (location.calc.dr as Record<string, number>).all ?? 0,
          penalty: location.hit_penalty ?? 0,
          rollText: location.calc.roll_range ?? '-',
          split,
          role,
        }

        acc[id] = newLocation

        return acc
      },
      {}
    )

    await this.#promptHitLocationOverwrite()
  }

  /* ---------------------------------------- */

  async #promptHitLocationOverwrite() {
    // No need to run this if there is no existing actor or if this is the first import.
    if (!this.actor || !this.actor.system.profile.modifiedon) return

    const currentBodyPlan = this.actor.system.bodyplan

    // Remove derived values / all values not proper to the hit location on its own.
    const currentHitLocations: Record<string, AnyMutableObject> = Object.fromEntries(
      this.actor.system.hitlocationsV2.map(hitLocation => {
        const location = hitLocation.toObject() as AnyMutableObject

        delete location._damageType
        delete location._dr
        delete location.drCap
        delete location.drItem
        delete location.drMod

        return [location._id, location]
      })
    )

    const currentHitLocationNullifiers = Object.fromEntries(
      this.actor.system.hitlocationsV2.map(location => [`-=${location._id}`, null])
    )

    const bodyPlansAreEqual = () => {
      const oldLocations = Object.values(currentHitLocations).map(({ _id, ...rest }) => rest)

      const newLocations = Object.values(
        this.output.hitlocationsV2 as Record<string, foundry.data.fields.SchemaField.CreateData<HitLocationSchemaV2>>
      ).map(({ _id, ...rest }) => rest)

      if (oldLocations.length !== newLocations.length) return false

      for (let i = 0; i < oldLocations.length; i++) {
        if (!foundry.utils.objectsEqual(oldLocations[i], newLocations[i] as AnyObject)) return false
      }

      return true
    }

    const statsDifference = currentBodyPlan !== this.output.bodyplan || !bodyPlansAreEqual()

    // If there is no difference between hit location tables, keep the old ones.
    if (!statsDifference) {
      this.output.hitlocationsV2 = currentHitLocations

      return
    }

    const automaticOverwrite = ImportSettings.overwriteBodyPlan

    if (automaticOverwrite === 'overwrite') {
      this.output.hitlocationsV2 = {
        ...this.output.hitlocationsV2,
        ...currentHitLocationNullifiers,
      }

      return // Automatically overwrite from file.
    } else if (automaticOverwrite === 'keep') {
      // Automatically ignore values from file.
      this.output.bodyplan = currentBodyPlan
      this.output.hitlocationsV2 = currentHitLocations

      return
    }

    const overwriteOption: 'keep' | 'overwrite' | null = await foundry.applications.api.DialogV2.wait({
      window: {
        title: game.i18n!.localize('GURPS.importer.promptBodyPlan.title'),
      },
      content: game.i18n!.format('GURPS.importer.promptBodyPlan.content', {
        currentBodyPlan,
        bodyplan: `${this.output.bodyplan}`,
      }),
      modal: true,
      buttons: [
        {
          action: 'keep',
          label: game.i18n!.localize('GURPS.dialog.keep'),
          icon: 'far fa-square',
          default: true,
        },
        {
          action: 'overwrite',
          label: game.i18n!.localize('GURPS.dialog.overwrite'),
          icon: 'fas fa-edit',
        },
      ],
    })

    if (overwriteOption === 'keep') {
      this.output.bodyplan = currentBodyPlan
      this.output.hitlocationsV2 = currentHitLocations
    } else {
      this.output.hitlocationsV2 = {
        ...this.output.hitlocationsV2,
        ...currentHitLocationNullifiers,
      }
    }
  }

  /* ---------------------------------------- */

  #importItems() {
    if (!this._isMode(GcsImporterMode.Character)) return

    this.input.traits?.forEach((trait, index) => this.#importTrait(trait, index))
    this.input.skills?.forEach((skill, index) => this.#importSkill(skill, index))
    this.input.spells?.forEach((spell, index) => this.#importSpell(spell, index))
    this.input.equipment?.forEach((equipment, index) => this.#importEquipment(equipment, index, true))
    this.input.other_equipment?.forEach((equipment, index) => this.#importEquipment(equipment, index, false))
  }

  /* ---------------------------------------- */

  #importPointTotals() {
    if (!this._isMode(GcsImporterMode.Character)) return

    this.output.totalpoints = {
      attributes: 0,
      race: 0,
      ads: 0,
      disads: 0,
      quirks: 0,
      skills: 0,
      spells: 0,
      total: 0,
      unspent: 0,
    }

    this.output.totalpoints!.attributes! += this.input.attributes.reduce(
      (acc, attr) => acc + (attr.calc.points ?? 0),
      0
    )

    this.input.traits?.forEach(trait => this.#calculateSingleTraitPoints(trait))

    this.output.totalpoints.skills = this.input.allSkills?.reduce((acc, skill) => acc + (skill.points ?? 0), 0) ?? 0
    this.output.totalpoints.spells = this.input.allSpells?.reduce((acc, spell) => acc + (spell.points ?? 0), 0) ?? 0

    this.output.totalpoints.unspent =
      this.input.total_points -
      this.output.totalpoints!.attributes! -
      this.output.totalpoints!.race! -
      this.output.totalpoints!.ads! -
      this.output.totalpoints!.disads! -
      this.output.totalpoints!.quirks! -
      this.output.totalpoints!.skills! -
      this.output.totalpoints!.spells!
  }

  /* ---------------------------------------- */

  #importMiscValues() {
    const modeWithSameName = (referenceMode: DataModel.CreateData<DataModel.SchemaOf<MoveModeV2>>) =>
      this.actor && [...this.actor.system.moveV2.values()].find(mode => mode.mode === referenceMode.mode)
    const modesAreEqual = (
      newMode: DataModel.CreateData<DataModel.SchemaOf<MoveModeV2>>,
      oldMode: MoveModeV2
    ): boolean =>
      newMode.mode === oldMode.mode && newMode.basic === oldMode.basic && newMode.enhanced === oldMode.enhanced

    const groundMove: DataModel.CreateData<DataModel.SchemaOf<MoveModeV2>> = {
      _id: foundry.utils.randomID(),
      mode: 'GURPS.moveModeGround',
      basic: this.output.basicmove?.value ?? 5,
      enhanced: 0,
    }

    const allModes = [groundMove]

    for (const mode of allModes) {
      const previousMode = modeWithSameName(mode)

      if (previousMode) {
        mode._id = previousMode._id
        if (modesAreEqual(mode, previousMode)) continue
      }

      this.output.moveV2 ||= {}
      this.output.moveV2[mode._id as string] = mode
    }

    this.output._currentMoveModeId = groundMove._id as string
  }

  /* ---------------------------------------- */

  #calculateSingleTraitPoints(trait: GcsTrait): void {
    if (trait.disabled) return

    if (trait.isContainer) {
      switch (trait.container_type) {
        case 'group':
          trait.childItems.forEach((child: GcsTrait) => this.#calculateSingleTraitPoints(child))
          break
        case 'ancestry':
          this.output.totalpoints!.race! += trait.adjustedPoints
          break
        case 'attributes':
          this.output.totalpoints!.race! += trait.adjustedPoints
          break
      }
    }

    const points = trait.adjustedPoints

    switch (true) {
      case points === -1:
        this.output.totalpoints!.quirks! += points
        break
      case points < 0:
        this.output.totalpoints!.disads! += points
        break
      case points > 0:
        this.output.totalpoints!.ads! += points
        break
    }
  }

  /* ---------------------------------------- */

  #importItem(item: AnyGcsItem, _carried = true): [DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>>, string] {
    const system: DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> = {
      actions: {},
      _reactions: {},
      _conditionalmods: {},
      notes: item.calc?.resolved_notes || item.local_notes || item.notes || '',
      pageref: item.reference ?? '',
      vtt_notes: item.vtt_notes ?? null,
      importFrom: 'GCS',
      importid: item.id ?? '',
    }

    let id = foundry.utils.randomID()

    const existingItemId = this.#existingItemId({ system, type: 'base', name: '' })

    if (existingItemId) id = existingItemId

    system.itemModifiers = ''
    system.open = true

    system.actions = item.weaponItems
      ?.map((action: GcsWeapon) => this.#importWeapon(action))
      .reduce(
        (
          acc: Record<string, DataModel.CreateData<MeleeAttackSchema | RangedAttackSchema>>,
          weapon: DataModel.CreateData<MeleeAttackSchema | RangedAttackSchema>
        ) => {
          if (!weapon._id || typeof weapon._id !== 'string') {
            console.error('GURPS | Failed to import weapon: No _id set.')
            console.error(weapon)

            return acc
          }

          acc[weapon._id] = weapon

          return acc
        },
        {}
      )

    const level = item instanceof GcsTrait ? (item.levels ?? 0) : 1

    system._reactions = Object.fromEntries(
      item.features
        ?.filter(feature => feature.type === 'reaction_bonus')
        .map(feature => {
          const _id = foundry.utils.randomID()

          const amount = feature.per_level ? Number(feature.amount) * level : Number(feature.amount)

          return [
            _id,
            {
              _id,
              modifier: amount,
              situation: String(feature.situation),
              modifierTags: '',
            },
          ]
        })
    )

    system._conditionalmods = Object.fromEntries(
      item.features
        ?.filter(feature => feature.type === 'conditional_modifier')
        .map(feature => {
          const _id = foundry.utils.randomID()
          const amount = feature.per_level ? Number(feature.amount) * level : Number(feature.amount)

          return [
            _id,
            {
              _id,
              modifier: amount,
              situation: String(feature.situation),
              modifierTags: '',
            },
          ]
        })
    )

    return [system, id]
  }

  /* ---------------------------------------- */

  #importWeapon(weapon: GcsWeapon): DataModel.CreateData<MeleeAttackSchema | RangedAttackSchema> {
    if (weapon.id.startsWith('w')) return this.#importMeleeWeapon(weapon)

    return this.#importRangedWeapon(weapon)
  }

  /* ---------------------------------------- */

  #importWeaponDefaults(weapon: GcsWeapon): string {
    if (!weapon.defaults) return ''

    const otfList: string[] = []

    for (const defaultData of weapon.defaults) {
      const modifier = defaultData.modifier
        ? defaultData.modifier > -1
          ? `+${defaultData.modifier}`
          : `${defaultData.modifier}`
        : ''

      if (defaultData.type === 'skill') {
        otfList.push(
          `S:"${defaultData.name}` +
            (defaultData.specialization ? `*(${defaultData.specialization})` : '') +
            '"' +
            modifier
        )
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
        ].includes(defaultData.type)
      ) {
        otfList.push(defaultData.type.replace('_', ' ') + modifier)
      }
    }

    return otfList.join('|')
  }

  /* ---------------------------------------- */

  #importMeleeWeapon(weapon: GcsWeapon): DataModel.CreateData<MeleeAttackSchema> {
    // Set name to null so that it inherists the parent item's name by default.
    const name = null
    const type = 'meleeAttack'
    const _id = foundry.utils.randomID()

    const parry = parseParry(weapon.parry || '')

    const block = parseBlock(weapon.block || '')

    // If we are importing a character instead of an Item Compendium,
    // we can apply parry bonuses from the character to the weapon's
    // parry and block values.
    if (this._isMode(GcsImporterMode.Character)) {
      if (parry.canParry) parry.modifier += this.input.calc.parry_bonus ?? 0
      if (block.canBlock) block.modifier += this.input.calc.block_bonus ?? 0
    }

    return {
      name,
      type,
      _id,
      baseParryPenalty: -4,
      block,
      damage: [weapon.calc?.damage || ''],
      import: weapon.calc?.level || 0,
      itemModifiers: '',
      mode: weapon.usage || '',
      modifierTags: '',
      notes: weapon.usage_notes || '',
      otf: this.#importWeaponDefaults(weapon),
      parry,
      reach: weapon.calc?.reach || weapon.reach || '',
      st: weapon.calc?.strength || weapon.strength,
    }
  }

  /* ---------------------------------------- */

  #importRangedWeapon(weapon: GcsWeapon): DataModel.CreateData<RangedAttackSchema> {
    // Set name to null so that it inherists the parent item's name by default.
    const name = null
    const type = 'rangedAttack'
    const _id = foundry.utils.randomID()

    return {
      name,
      type,
      _id,
      acc: weapon.calc?.accuracy || weapon.accuracy || '',
      bulk: weapon.calc?.bulk || weapon.bulk || '0',
      damage: [weapon.calc?.damage || ''],
      import: weapon.calc?.level || 0,
      itemModifiers: '',
      modifierTags: '',
      notes: weapon.usage_notes || '',
      otf: this.#importWeaponDefaults(weapon),
      range: weapon.calc?.range || weapon.range || '',
      rateOfFire: weapon.calc?.rate_of_fire || weapon.rate_of_fire || '',
      recoil: weapon.calc?.recoil || weapon.recoil || '',
      shots: weapon.calc?.shots || weapon.shots || '',
      st: weapon.calc?.strength || weapon.strength,
    }
  }

  /* ---------------------------------------- */

  #importTrait(trait: GcsTrait, index: number, containedBy?: string | undefined): Item.CreateData {
    const type = ItemType.Trait
    // TODO: localize
    const name = trait.name ?? 'Trait'

    const [baseSystem, _id] = this.#importItem(trait)

    const system: DataModel.CreateData<TraitSchema> = {
      ...baseSystem,
      disabled: trait.disabled,
      containedBy: containedBy ?? null,
      cr: trait.cr ?? null,
      level: trait.can_level ? (trait.levels ?? 0) : null,
      userdesc: trait.userdesc ?? '',
      points: trait.calc?.points ?? 0,
    }

    trait.childItems?.forEach((child: GcsTrait, childIndex: number) => this.#importTrait(child, childIndex, _id))

    // component.contains = children.map((c: Item.CreateData) => c._id as string)
    const item: Item.CreateData<ItemType.Trait> = {
      _id,
      type,
      name,
      sort: index,
      system,
    }

    this.items.push(item)

    return item
  }

  /* ---------------------------------------- */

  #importSkill(skill: GcsSkill, index: number, containedBy?: string | undefined): Item.CreateData {
    const type = ItemType.Skill
    // TODO: localize
    const name = skill.name ?? 'Skill'

    const [baseSystem, _id] = this.#importItem(skill)

    const system: DataModel.CreateData<SkillSchema> = {
      ...baseSystem,
      containedBy: containedBy ?? null,
      points: skill.points ?? 0,
      difficulty: skill.difficulty ?? '',
      relativelevel: skill.calc?.rsl ?? '',
      import: skill.calc?.level ?? 0,
      specialization: skill.specialization ?? '',
      techlevel: skill.tech_level ?? '',
    }

    skill.childItems?.forEach((child: GcsSkill, childIndex: number) => this.#importSkill(child, childIndex, _id))

    const item: Item.CreateData<ItemType.Skill> = {
      _id,
      type,
      name,
      sort: index,
      system,
    }

    this.items.push(item)

    return item
  }

  /* ---------------------------------------- */

  #importSpell(spell: GcsSpell, index: number, containedBy?: string | undefined): Item.CreateData {
    const type = ItemType.Spell
    // TODO: localize
    const name = spell.name ?? 'Spell'

    const [baseSystem, _id] = this.#importItem(spell)

    const system: DataModel.CreateData<SpellSchema> = {
      ...baseSystem,
      containedBy: containedBy ?? null,
      points: spell.points ?? 0,
      difficulty: spell.difficulty ?? '',
      relativelevel: spell.calc?.rsl ?? '',
      import: spell.calc?.level ?? 0,
      class: spell.spell_class ?? '',
      college: spell.college?.join(', ') ?? '',
      cost: spell.casting_cost ?? '',
      maintain: spell.maintenance_cost ?? '',
      duration: spell.duration ?? '',
      resist: spell.resist ?? '',
      casttime: spell.casting_time ?? '',
      techlevel: spell.tech_level ?? '',
    }

    spell.childItems?.forEach((child: GcsSpell, childIndex: number) => this.#importSpell(child, childIndex, _id))

    const item: Item.CreateData<ItemType.Spell> = {
      _id,
      type,
      name,
      sort: index,
      system,
    }

    this.items.push(item)

    return item
  }

  /* ---------------------------------------- */

  #importEquipment(
    equipment: GcsEquipment,
    index: number,
    _carried: boolean,
    containedBy?: string | undefined
  ): Item.CreateData {
    const type = ItemType.Equipment
    // TODO: localize
    const name = equipment.name ?? 'Equipment'

    const weight = equipment.calc?.weight
      ? parseFloat(equipment.calc.weight)
      : parseFloat(equipment.calc?.extended_weight || '0')

    const [baseSystem, _id] = this.#importItem(equipment)

    const system: DataModel.CreateData<EquipmentSchema> = {
      ...baseSystem,
      containedBy: containedBy ?? null,
      count: equipment.quantity ?? 1,
      weight,
      cost: equipment.calc?.value ?? 0,
      location: '',
      _carried,
      equipped: equipment.equipped ?? false,
      techlevel: equipment.tech_level ?? '',
      categories: equipment.tags?.join(', ') ?? '',
      costsum: equipment.calc?.extended_value || 0,
      weightsum: equipment.calc?.extended_weight,
      uses: equipment.uses ?? 0,
      maxuses: equipment.max_uses ?? 0,
      originalCount: String(equipment.quantity ?? 1),
      ignoreImportQty: false,
    }

    equipment.childItems?.forEach((child: GcsEquipment, childIndex: number) =>
      this.#importEquipment(child, childIndex, _carried, _id)
    )

    const item: Item.CreateData<ItemType.Equipment> = {
      _id,
      type,
      name,
      sort: index,
      system,
    }

    this.items.push(item)

    return item
  }

  /* ---------------------------------------- */

  #importNotes() {
    if (!this._isMode(GcsImporterMode.Character)) return

    this.output.allNotes = {}
    if (this.input.notes) this.input.notes.forEach(note => this.#importNote(note, null))
  }

  /* ---------------------------------------- */

  #importNote(gcsNote: GcsNote, containedBy: string | null): void {
    const note: DataModel.CreateData<NoteV2Schema> = {
      _id: foundry.utils.randomID(),
      open: true,
      containedBy,
      markdown: gcsNote.markdown,
      text: gcsNote.text,
      reference: gcsNote.reference,
      reference_highlight: gcsNote.reference_highlight,
      importid: gcsNote.id,
      calc: {
        resolved_notes: gcsNote.calc?.resolved_notes ?? null,
      },
    }

    const existingNote = (this.actor?.system.allNotes.contents ?? []).find(
      existing => existing?.importid === note.importid
    )

    if (existingNote) note._id = existingNote._id

    const id = note._id as string

    gcsNote.childItems.forEach((child: GcsNote) => {
      this.#importNote(child, id)
    })

    this.output.allNotes ||= {}
    this.output.allNotes[id] = note
  }
}

export { GcsImporter }
