import { DataModel } from '@gurps-types/foundry/index.js'
import { MeleeAttackSchema, RangedAttackSchema } from '@module/action/index.js'
import { parseBlock } from '@module/action/parse-weapon.js'
import { CharacterSchema } from '@module/actor/data/character.js'
import { HitLocationSchemaV2 } from '@module/actor/data/hit-location-entry.js'
import { BaseItemModel } from '@module/item/data/base.js'
import { EquipmentSchema } from '@module/item/data/equipment.js'
import { SkillSchema } from '@module/item/data/skill.js'
import { SpellSchema } from '@module/item/data/spell.js'
import { TraitSchema } from '@module/item/data/trait.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'

import { HitLocation, hitlocationDictionary } from '../../hitlocation/hitlocation.js'
import { createDataIsOfType, createStandardTrackers, promptDeletionOfMigratedItems } from '../helpers.js'
import { ImportSettings } from '../index.js'

import { GCAAttackMode, GCACharacter, GCATrait } from './schema.js'

/**
 * NOTE: Some parts of this importer are not fully implemented and cannot be without pretty significantly
 * complicating the importer. These should be implemented later, as specified per item below:
 * - Some Ads/Disads have names which change depending on the level of the Ad/Disad. GGA currently has
 *   no data model field to support this functionality, but it should be added at some point.
 * - Some attacks use unconvential damage strings. For example "slam+2" for shields, or the prefix "~"
 *   to indicate a leveled attack (e.g. Fireball). The damage dice parsing system does not currently
 *   support this functionality, but should be expanded to do so at some point.
 */

class GcaImporter {
  actor?: Actor.OfType<'characterV2'>
  input: GCACharacter
  output: DataModel.CreateData<CharacterSchema>
  items: Item.CreateData[]
  existingItems: Item.Stored[]
  img: string

  /* ---------------------------------------- */

  constructor(input: GCACharacter) {
    this.input = input
    this.output = {}
    this.existingItems = []

    this.items = []
    this.img = ''
  }

  /* ---------------------------------------- */

  static async importCharacter(
    input: GCACharacter,
    actor?: Actor.OfType<'characterV2'>
  ): Promise<Actor.OfType<'characterV2'>> {
    return await new GcaImporter(input).#importCharacter(actor)
  }

  /* ---------------------------------------- */

  async #importCharacter(actor?: Actor.OfType<'characterV2'>) {
    const _id = foundry.utils.randomID()
    const type = 'characterV2'
    const name = this.input.name ?? 'Imported Character'

    // Set actor as a GcaImporter property for easier reference.
    if (actor) {
      this.actor = actor
      this.existingItems = actor.items.contents
    }

    this.#importPortrait()
    this.#importAttributes()
    this.#importProfile()
    await this.#importHitLocations()
    this.#importItems()
    this.#importPointTotals()
    this.#importMiscValues()
    await promptDeletionOfMigratedItems(this.actor)
    createStandardTrackers(this)

    if (actor) {
      // When importing into existing actor, save count and uses for equipment with ignoreImportQty flag
      const savedEquipmentCounts = this.#saveEquipmentCountsIfNecessary(
        actor.items.contents.filter(item => item.isOfType('equipmentV2'))
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

    return actor
  }

  /* ---------------------------------------- */

  #restoreEquipmentCountsAndUses(savedEquipmentCounts: Map<string, { quantity: number; uses: number }>) {
    if (savedEquipmentCounts.size > 0) {
      for (const itemData of this.items) {
        if (createDataIsOfType(itemData, 'equipmentV2')) {
          const system = itemData.system

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

  #existingItemId(itemData: Item.CreateData): string | null {
    const system = itemData.system as AnyObject
    const id = system?.importid

    if (!id) return null

    const existingId = this.existingItems.find(existing => existing.system.importid === id)?._id ?? null

    return existingId || null
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
  async #deleteImportedItems(actor: Actor.OfType<'characterV2'>) {
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

  #saveEquipmentCountsIfNecessary(items: Item.OfType<'equipmentV2'>[]) {
    const savedEquipmentCounts = new Map<string, { quantity: number; uses: number }>()

    items.forEach(item => {
      const system = item.system

      if (system && system.importFrom === 'GCA' && system.ignoreImportQty && system.importid) {
        savedEquipmentCounts.set(system.importid, { quantity: system.count, uses: system.uses })
      }
    })

    return savedEquipmentCounts
  }

  /* ---------------------------------------- */

  #importPortrait() {
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

    if (!this.input.vitals?.portraitimage) {
      // No portrait provided. Don't import.
      return
    }

    this.img = `data:image/png;base64,${this.input.vitals?.portraitimage}`
  }

  /* ---------------------------------------- */

  #importAttributes() {
    this.output.attributes = { ST: {}, DX: {}, IQ: {}, HT: {} }

    for (const key of ['ST', 'DX', 'IQ', 'HT', 'QN', 'WILL', 'PERCEPTION'] as const) {
      const attribute = this.input.traits.attributes.find(attr => attr.name.toLowerCase() === key.toLowerCase())

      this.output.attributes[key === 'PERCEPTION' ? 'PER' : key] = {
        import: attribute?.score ?? 10,
        points: attribute?.points ?? 0,
      }
    }

    const basicSpeed = this.input.traits.attributes.find(attr => attr.name === 'Basic Speed')

    this.output.basicspeed = {
      value: basicSpeed?.score ?? 5,
      points: basicSpeed?.points ?? 0,
    }

    const basicMove = this.input.traits.attributes.find(attr => attr.name === 'Basic Move')

    this.output.basicmove = {
      value: basicMove?.score ?? 5,
      points: basicMove?.points ?? 0,
    }

    const dodge = this.input.traits.attributes.find(attr => attr.name === 'Dodge')

    this.output.dodge = {
      value: dodge?.score ?? 8,
    }

    // TODO: check if we can implement this in any way with the current character schema
    // const parry = this.input.traits.attributes.find(attr => attr.name === 'Parry')
    // this.output.parry = parry?.score ?? 0

    for (const key of ['HP', 'FP', 'QP'] as const) {
      const attribute = this.input.traits.attributes.find(attr => attr.symbol?.toLowerCase() === key.toLowerCase())

      if (attribute) {
        this.output[key] = {
          min: 0,
          max: attribute.score,
          // NOTE: apparently GCA does not store injury?
          value: attribute.score,
          points: attribute.points,
        }
      } else {
        this.output[key] = {
          min: 0,
          max: 10,
          value: 10,
          points: 0,
        }
      }
    }

    const otherAttributeKeys = {
      frightcheck: 'Fright Check',
      vision: 'Vision',
      hearing: 'Hearing',
      tastesmell: 'Taste/Smell',
      touch: 'Touch',
    }

    for (const [gga, gca] of Object.entries(otherAttributeKeys)) {
      const attribute = this.input.traits.attributes.find(attr => attr.name === gca)

      if (attribute) {
        this.output[gga as 'frightcheck' | 'vision' | 'tastesmell' | 'touch'] = attribute.score
      } else {
        this.output[gga as 'frightcheck' | 'vision' | 'tastesmell' | 'touch'] = 10
      }
    }

    // Import Basic Thrust and Basic Swing damage
    const st = this.output.attributes?.ST?.import ?? 0

    let basicDamageEntry = this.input.basicdamages.find(damageEntry => damageEntry.st === st)

    if (!basicDamageEntry) {
      console.error(`GURPS | Failed to import basic damages: No entry corresponding to ST value "${st}"`)
      basicDamageEntry = { st: 0, thbase: '1', thadd: '-6', swbase: '1', swadd: '-6' }
    }

    const thrust = `${basicDamageEntry.thbase}d${basicDamageEntry.thadd === '0' ? '' : basicDamageEntry.thadd}`
    const swing = `${basicDamageEntry.swbase}d${basicDamageEntry.swadd === '0' ? '' : basicDamageEntry.swadd}`

    this.output.thrust = thrust
    this.output.swing = swing

    // Import speeds for move modes(based on attributes in GGA)
    const groundMove = {
      _id: foundry.utils.randomID(),
      mode: 'GURPS.moveModeGround',
      default: true,
      ...this.#importMoveType('Ground Move'),
    }

    const airMove = {
      _id: foundry.utils.randomID(),
      mode: 'GURPS.moveModeAir',
      default: false,
      ...this.#importMoveType('Air Move'),
    }

    const waterMove = {
      _id: foundry.utils.randomID(),
      mode: 'GURPS.moveModeWater',
      default: false,
      ...this.#importMoveType('Water Move'),
    }

    const spaceMove = {
      _id: foundry.utils.randomID(),
      mode: 'GURPS.moveModeSpace',
      default: false,
      ...this.#importMoveType('Space Move'),
    }

    this.output.moveV2 ||= {}
    this.output.moveV2[groundMove._id] = groundMove
    this.output.moveV2[airMove._id] = airMove
    this.output.moveV2[waterMove._id] = waterMove
    this.output.moveV2[spaceMove._id] = spaceMove
  }

  /* ---------------------------------------- */

  #importMoveType(moveType: string) {
    const basicMove = this.input.traits.attributes.find(attr => attr.name.toLowerCase() === moveType.toLowerCase())
    // NOTE: This may need localization.
    const enhancedMove = this.input.traits.attributes.find(
      attr => attr.name.toLowerCase() === `Enhanced ${moveType}`.toLowerCase()
    )

    return {
      basic: basicMove?.score ?? 0,
      enhanced: enhancedMove?.score ?? 0,
    }
  }

  /* ---------------------------------------- */

  #importProfile() {
    const { vitals } = this.input

    const SM = this.input.traits.attributes.find(attr => attr.symbol === 'SM')
    const TL = this.input.traits.attributes.find(attr => attr.symbol === 'TL')

    const authorCreatedRaw = this.input.author?.datecreated
    let createdDate = authorCreatedRaw ? new Date(authorCreatedRaw) : new Date()

    if (isNaN(createdDate.getTime())) {
      createdDate = new Date()
    }

    const createdon = createdDate.toISOString()
    const modifiedon = new Date().toISOString()

    this.output.profile = {
      title: '',
      height: vitals?.height ?? '',
      weight: vitals?.weight ?? '',
      age: vitals?.age ?? '',
      race: vitals?.race ?? '',
      birthday: '',
      religion: '',
      gender: '',
      eyes: '',
      hair: '',
      hand: '',
      skin: '',
      sizemod: SM?.score ?? 0,
      techlevel: `${TL?.score ?? 0}`,
      createdon,
      modifiedon,
      player: this.input.player ?? '',
    }
  }

  /* ---------------------------------------- */

  async #importHitLocations() {
    this.output.bodyplan = this.input.bodytype ?? 'Humanoid'

    const table = hitlocationDictionary?.[this.input.bodytype ?? 'Humanoid']

    this.output.hitlocationsV2 = this.input.hitlocationtable.hitlocationlines.reduce(
      (acc: Record<string, DataModel.CreateData<HitLocationSchemaV2>>, location) => {
        const id = foundry.utils.randomID()

        // Some properties of the hit location are stored not in the hit location table, but in the body table.
        // These are different but related tables. All locations in "hitlocationtable" *should* be in "body".
        // However, different names may be in use. We're accounting for these possibilities.
        let lookupName = location.location

        if (lookupName === 'Eye') lookupName = 'Eyes'
        if (lookupName === 'Foot') lookupName = 'Feet'
        if (lookupName === 'Hand') lookupName = 'Hands'

        const bodyLocation = this.input.body?.find(bodyPart => bodyPart.name === lookupName)

        if (!bodyLocation) {
          console.error(
            `Failed to import hit location table entry "${location.location}". No matching body part found.`
          )

          return acc
        }

        let roll = ''

        if (table) {
          const [_, standardEntry] = HitLocation.findTableEntry(table, bodyLocation.name)

          if (standardEntry) {
            roll = standardEntry.roll
          }
        }

        const dr = parseInt(bodyLocation.dr)

        // Try to determine the role of the hit location. This is used in the Damage Calculator to determine crippling
        // damage and other effects.
        const tempEntry = hitlocationDictionary![this.output.bodyplan!.toLowerCase()]
        const entry = Object.values(tempEntry).find((entry: any) => entry.id === location.location) as
          | { id?: string; role?: string }
          | undefined
        const role = entry?.role ?? entry?.id ?? ''

        const newLocation: DataModel.CreateData<HitLocationSchemaV2> = {
          _id: id,
          flags: {},
          where: location.location ?? '',
          import: Number.isNaN(dr) ? 0 : dr,
          rollText: roll,
          penalty: Number(location.penalty) || 0,
          split: {},
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
    if (!this.actor || (!this.actor.system.profile.modifiedon && !this.actor.system.additionalresources.importname))
      return

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
    const parentsOnly = (items: GCATrait[]) => items.filter(item => !item.parentkey)

    parentsOnly(this.input.traits.advantages)?.forEach(trait => this.#importTrait(trait))
    parentsOnly(this.input.traits.disadvantages)?.forEach(trait => this.#importTrait(trait))
    parentsOnly(this.input.traits.cultures)?.forEach(trait => this.#importTrait(trait))
    parentsOnly(this.input.traits.languages)?.forEach(trait => this.#importTrait(trait))
    parentsOnly(this.input.traits.perks)?.forEach(trait => this.#importTrait(trait))
    parentsOnly(this.input.traits.quirks)?.forEach(trait => this.#importTrait(trait))
    parentsOnly(this.input.traits.skills)?.forEach(skill => this.#importSkill(skill))
    parentsOnly(this.input.traits.spells)?.forEach(spell => this.#importSpell(spell))
    parentsOnly(this.input.traits.equipment)?.forEach(equipment => this.#importEquipment(equipment))
  }

  /* ---------------------------------------- */

  #importPointTotals() {
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
  }

  /* ---------------------------------------- */

  #importMiscValues() {}

  /* ---------------------------------------- */

  #importItem(
    item: GCATrait,
    containedBy: string | null = null
  ): [DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>>, string] {
    const system: DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> = {
      // name: item.name ?? '',
      notes: item.ref?.notes ?? '',
      pageref: item.ref?.page ?? '',
      vtt_notes: item.ref?.vttnotes ?? '',
      importFrom: 'GCA',
      actions: {},
      _reactions: {},
      _conditionalmods: {},
      containedBy,
      importid: `k${item.$idkey}`,
    }

    let id = foundry.utils.randomID()
    const existingItemId = this.#existingItemId({ system, type: 'base', name: '' })

    if (existingItemId) id = existingItemId

    if (item.attackmodes) {
      system.actions = item.attackmodes
        .map((action: GCAAttackMode) => this.#importWeapon(action))
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
    }

    return [system, id]
  }

  /* ---------------------------------------- */

  #importWeapon(weapon: GCAAttackMode): DataModel.CreateData<MeleeAttackSchema | RangedAttackSchema> {
    if (weapon.reach !== null) return this.#importMeleeWeapon(weapon)

    return this.#importRangedWeapon(weapon)
  }

  /* ---------------------------------------- */

  #importMeleeWeapon(weapon: GCAAttackMode): DataModel.CreateData<MeleeAttackSchema> {
    // Set name to null so that it inherists the parent item's name by default.
    const name = null
    const type = 'meleeAttack'
    const _id = foundry.utils.randomID()

    const damage = [`${weapon.chardamage} ${weapon.chardamtype}`]

    const level = weapon.charskillscore ?? 0

    const block = parseBlock(weapon.charblockscore ?? '')
    // The GCA block value is the pre-calculated block value. We're getting
    // the expected block value given 0 block modifier to see if the weapon
    // has any block bonus.
    const blockLevelDifference = Math.floor(level / 2) + 3

    block.modifier = (block.modifier ?? 0) - blockLevelDifference

    let parry = weapon.parry

    const baseParry = Number(parry ?? '')

    if (!isNaN(baseParry)) {
      const parryBonus = this.input.traits.attributes.find(attr => attr.name === 'Parry')?.score ?? 0

      parry = (baseParry + parryBonus).toString()
    }

    return {
      name,
      type,
      _id,
      baseParryPenalty: -4,
      block,
      damage,
      import: level,
      itemModifiers: '',
      mode: weapon.name ?? '',
      modifierTags: '',
      notes: weapon.notes ?? '',
      parry,
      reach: weapon.charreach ?? '',
      st: weapon.charminst ?? '',
    }
  }

  #importRangedWeapon(weapon: GCAAttackMode): DataModel.CreateData<RangedAttackSchema> {
    // Set name to null so that it inherists the parent item's name by default.
    const name = null
    const type = 'rangedAttack'
    const _id = foundry.utils.randomID()

    const damage = [`${weapon.chardamage} ${weapon.chardamtype}`]

    const halfDamageRange = weapon.charrangehalfdam ?? ''
    const maxRange = weapon.charrangemax ?? ''
    const range = halfDamageRange && maxRange ? `${halfDamageRange}/${maxRange}` : halfDamageRange || maxRange || ''

    return {
      name,
      type,
      _id,
      acc: weapon.characc ?? '',
      damage,
      import: weapon.charskillscore ?? 0,
      itemModifiers: '',
      mode: weapon.name ?? '',
      modifierTags: '',
      notes: weapon.notes ?? '',
      range,
      recoil: weapon.charrcl ?? '',
      shots: weapon.charshots ?? '',
      st: weapon.charminst ?? '',
    }
  }

  /* ---------------------------------------- */

  /**
   * Imports the GCA-schema'd Trait and converts it to a GGA Trait ("feature"").
   * TODO: trait.calcs.levelnames is a commat delimited list (as a string), with optional
   * quote marks. Valid formats include: "foo","bar,"baz" or foo, bar, baz.
   * This decides what the "names" of levels of a trait are. This is used for traits
   * such as:
   * - Trading Character Points for Money (DFRPG:A95)
   * - Combat Reflexes (B43)
   * Ideally this should be implemented in a similar way to how it is done in GCA, for greater
   * parity and data retention.
   */
  #importTrait(trait: GCATrait, containedBy: string | null = null): void {
    const type = 'featureV2'

    let name = trait.name ?? 'Trait'
    const crRegex = /\[\s*CR: (\d{1,2})\s*\]/i

    const isLeveled = trait.calcs.cost?.includes('/') ?? false

    const [baseSystem, _id] = this.#importItem(trait, containedBy)

    const system: DataModel.CreateData<TraitSchema> = {
      ...baseSystem,
      cr: 0,
      level: isLeveled ? (trait.level ?? 0) : null,
      userdesc: trait.ref?.description ?? '',
      points: trait.points ?? 0,
    }

    if (crRegex.test(name)) {
      system.cr = parseInt(name.match(crRegex)?.[1] ?? '0')
      name = name.replace(crRegex, '').trim()
    }

    trait
      .getChildren([
        ...this.input.traits.advantages,
        ...this.input.traits.disadvantages,
        ...this.input.traits.perks,
        ...this.input.traits.quirks,
        ...this.input.traits.cultures,
        ...this.input.traits.languages,
      ])
      ?.forEach((child: GCATrait) => this.#importTrait(child, _id))

    const item: Item.CreateData = {
      _id,
      type,
      name,
      system,
    }

    this.items.push(item)
  }

  /* ---------------------------------------- */

  #importSkill(skill: GCATrait, containedBy: string | null = null): void {
    const type = 'skillV2'
    // TODO: localize
    const name = skill.name ?? 'Skill'

    const [baseSystem, _id] = this.#importItem(skill, containedBy)

    const system: DataModel.CreateData<SkillSchema> = {
      ...baseSystem,
      points: skill.points ?? 0,
      difficulty: skill.type ?? '',
      relativelevel: `${skill.stepoff}${skill.step}`,
      import: skill.level ?? 0,
    }

    skill.getChildren(this.input.traits.skills)?.forEach((child: GCATrait) => this.#importSkill(child, _id))

    const item: Item.CreateData = {
      _id,
      type,
      name,
      system,
    }

    this.items.push(item)
  }

  /* ---------------------------------------- */

  #importSpell(spell: GCATrait, containedBy: string | null = null): void {
    const type = 'spellV2'
    // TODO: localize
    const name = spell.name ?? 'Spell'

    let spellClass = ''
    let spellResist = ''

    if (spell.ref?.class?.includes('/')) {
      ;[spellClass, spellResist] = spell.ref.class.split('/')
    } else {
      spellClass = spell.ref?.class ?? ''
    }

    let spellCost = ''
    let spellMaintain = ''

    if (spell.ref?.castingcost?.includes('/')) {
      ;[spellCost, spellMaintain] = spell.ref.castingcost.split('/')
    } else {
      spellCost = spell.ref?.castingcost ?? ''
      spellMaintain = spell.ref?.castingcost ?? ''
    }

    // Trim hidden colleges (those starting with ~)
    const college =
      spell.cat
        ?.split(',')
        .map(collegeName => collegeName.trim())
        .filter(collegeName => !collegeName.startsWith('~'))
        .join(', ') ?? ''

    const [baseSystem, _id] = this.#importItem(spell, containedBy)

    const system: DataModel.CreateData<SpellSchema> = {
      ...baseSystem,
      points: spell.points ?? 0,
      difficulty: spell.type ?? '',
      relativelevel: `${spell.stepoff}${spell.step}`,
      import: spell.level ?? 0,
      class: spellClass,
      college,
      cost: spellCost,
      maintain: spellMaintain,
      duration: spell.ref?.duration ?? '',
      resist: spellResist,
      casttime: spell.ref?.time ?? '',
    }

    spell.getChildren(this.input.traits.spells)?.forEach((child: GCATrait) => this.#importSpell(child, _id))

    const item: Item.CreateData = {
      _id,
      type,
      name,
      system,
    }

    this.items.push(item)
  }

  /* ---------------------------------------- */

  #importEquipment(equipment: GCATrait, containedBy: string | null = null): void {
    const type = 'equipmentV2'
    const name = equipment.name ?? 'Equipment'

    const [baseSystem, _id] = this.#importItem(equipment, containedBy)

    const system: DataModel.CreateData<EquipmentSchema> = {
      ...baseSystem,
      count: equipment.count ?? 1,
      weight: parseFloat(equipment.calcs.postformulaweight ?? '0') || 0,
      cost: parseFloat(equipment.calcs.postformulacost ?? '0') || 0,
      location: '',
      carried: true,
      equipped: true,
      techlevel: equipment.tl ?? '',
      categories: equipment.cat,
      costsum: parseFloat(equipment.calcs.postchildrencost || equipment.calcs.postformulacost || '0') || 0,
      weightsum: equipment.calcs.postchildrenweight || equipment.calcs.postformulaweight || '',
      uses: 0,
      maxuses: 0,
    }

    equipment.getChildren(this.input.traits.equipment)?.forEach((child: GCATrait) => this.#importEquipment(child, _id))

    const item: Item.CreateData = {
      _id,
      type,
      name,
      system,
    }

    this.items.push(item)
  }
}

/* ---------------------------------------- */

export { GcaImporter }
