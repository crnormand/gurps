import DataModel = foundry.abstract.DataModel

import { CharacterSchema } from '../actor/data/character.js'
import { GcsCharacter } from './schema/character.js'
import { GcsItem } from './schema/base.js'
import { TraitComponentSchema, TraitSchema } from 'module/item/data/trait.js'
import { BaseItemModel } from 'module/item/data/base.js'
import { GcsTrait } from './schema/trait.js'
import { ItemComponentSchema } from 'module/item/data/component.js'
import { AnyGcsItem } from './schema/index.js'
import { GcsEquipment } from './schema/equipment.js'
import { MeleeAttackComponentSchema, MeleeAttackSchema } from '../action/melee-attack.js'
import { RangedAttackComponentSchema, RangedAttackSchema } from '../action/ranged-attack.js'
import { GcsWeapon } from './schema/weapon.js'
import { SkillComponentSchema, SkillSchema } from '../item/data/skill.js'
import { GcsSkill } from './schema/skill.js'

import { EquipmentSchema, EquipmentComponentSchema } from '../item/data/equipment.js'
import { HitLocationSchemaV2 } from '../actor/data/hit-location-entry.js'
import { hitlocationDictionary } from '../hitlocation/hitlocation.js'
import { GurpsActorV2 } from 'module/actor/gurps-actor.js'
import { GcsSpell } from './schema/spell.js'
import { SpellComponentSchema, SpellSchema } from 'module/item/data/spell.js'

/**
 * GCS Importer class for importing GCS characters into the system.
 * This class handles the conversion of GCS character data into the format used by the GURPS system.
 */
class GcsImporter {
  input: GcsCharacter
  output: DataModel.CreateData<CharacterSchema>
  items: DataModel.CreateData<DataModel.SchemaOf<GcsItem<any>>>[]
  img: string

  /* ---------------------------------------- */

  constructor(input: GcsCharacter) {
    this.input = input
    this.output = {}
    this.items = []
    this.img = ''
  }

  /* ---------------------------------------- */

  /**
   * Given a GCS Character, create a (new) GURPS Actor.
   * @param input GCS Character data
   */
  static async importCharacter(input: GcsCharacter): Promise<GurpsActorV2<'characterV2'>> {
    return await new GcsImporter(input).#importCharacter()
  }

  /* ---------------------------------------- */

  async #importCharacter(): Promise<GurpsActorV2<'characterV2'>> {
    const _id = foundry.utils.randomID()
    const type = 'characterV2'
    const name = this.input.profile.name ?? 'Imported Character'

    this.#importPortrait()
    this.#importAttributes()
    this.#importProfile()
    this.#importHitLocations()
    this.#importItems()
    this.#importPointTotals()
    this.#importMiscValues()
    this.#createStandardTrackers()

    console.log({
      _id,
      name,
      type,
      system: this.output,
      items: this.items,
    })

    const actor = (await Actor.create({
      _id,
      name,
      type,
      img: this.img,
      // FIXME: not sure why this is not resolving correctly
      system: this.output as any,
      items: this.items as any,
    })) as GurpsActorV2<'characterV2'> | undefined

    if (!actor) {
      throw new Error('Failed to create GURPS actor during import.')
    }
    return actor
  }

  /* ---------------------------------------- */

  #importPortrait() {
    if (game.user?.hasPermission('FILES_UPLOAD')) {
      this.img = `data:image/png;base64,${this.input.profile.portrait}.png`
    }
  }

  /* ---------------------------------------- */

  #importAttributes() {
    this.output.attributes = { ST: {}, DX: {}, IQ: {}, HT: {}, WILL: {}, PER: {}, QN: {} }

    for (let key of ['ST', 'DX', 'IQ', 'HT', 'QN', 'WILL', 'PER'] as const) {
      const attribute = this.input.attributes.find(attr => attr.attr_id === key.toLowerCase())
      if (attribute) {
        this.output.attributes[key] = {
          import: attribute.calc.value,
          points: attribute.calc.points,
        }
      } else {
        this.output.attributes[key] = {
          import: 10,
          points: 0,
        }
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
          value: attribute.calc.current,
          points: attribute.calc.points,
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
  }

  /* ---------------------------------------- */

  #importProfile() {
    const { profile } = this.input
    this.output.traits = {
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

  #importHitLocations() {
    this.output.additionalresources ||= {}
    this.output.additionalresources.bodyplan = this.input.settings.body_type.name ?? 'Humanoid'

    this.output.hitlocationsV2 = []
    this.input.settings.body_type.locations.forEach(location => {
      const split = { ...(location.calc.dr as Record<string, number>) }
      delete split.all // Remove the 'all' key, as it is already present in the 'import' field

      // Try to determine the role of the hit location. This is used in the Damage Calculator to determine crippling
      // damage and other effects.
      let temp = hitlocationDictionary![this.output.additionalresources!.bodyplan!.toLowerCase()] as any
      let entry = Object.values(temp).find((entry: any) => entry.id === location.id)
      // @ts-expect-error
      let role = entry?.role ?? entry?.id

      const newLocation: DataModel.CreateData<HitLocationSchemaV2> = {
        where: location.table_name ?? '',
        import: (location.calc.dr as Record<string, number>).all ?? 0,
        penalty: location.hit_penalty ?? 0,
        rollText: location.calc.roll_range ?? '-',
        split,
        role,
      }

      ;(this.output.hitlocationsV2 as DataModel.CreateData<HitLocationSchemaV2>[]).push(newLocation)
    })
  }

  /* ---------------------------------------- */

  #importItems() {
    this.input.traits?.forEach((trait, index) => this.#importTrait(trait, index))
    this.input.skills?.forEach((skill, index) => this.#importSkill(skill, index))
    this.input.spells?.forEach((spell, index) => this.#importSpell(spell, index))
    this.input.equipment?.forEach((equipment, index) => this.#importEquipment(equipment, index, true))
    this.input.other_equipment?.forEach((equipment, index) => this.#importEquipment(equipment, index, false))
  }

  /* ---------------------------------------- */

  #importPointTotals() {
    // TODO Implement me.
  }

  /* ---------------------------------------- */

  #importMiscValues() {
    // TODO Implement me.
  }

  /* ---------------------------------------- */

  // @ts-expect-error
  #calculateSingleTraitPoints(trait: GcsTrait): void {
    // TODO Implement me.
  }

  /* ---------------------------------------- */

  #importItem(item: AnyGcsItem, _carried = true): DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> {
    const system: DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> = { actions: {} }
    system.isContainer = item.isContainer
    system.itemModifiers = ''
    system.open = true

    system.actions = item.weaponItems
      ?.map((action: GcsWeapon) => this.#importWeapon(action, item))
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
    system.reactions = item.features
      ?.filter(e => e.type === 'reaction_bonus')
      .map(e => {
        const amount = e.per_level ? Number(e.amount) * level : Number(e.amount)
        return {
          modifier: amount,
          situation: String(e.situation),
          modifierTags: '',
        }
      })

    system.conditionalmods = item.features
      ?.filter(e => e.type === 'conditional_modifier')
      .map(e => {
        const amount = e.per_level ? Number(e.amount) * level : Number(e.amount)
        return {
          modifier: amount,
          situation: String(e.situation),
          modifierTags: '',
        }
      })

    return system
  }

  /* ---------------------------------------- */

  #importWeapon(weapon: GcsWeapon, item: AnyGcsItem): DataModel.CreateData<MeleeAttackSchema | RangedAttackSchema> {
    if (weapon.id.startsWith('w')) return this.#importMeleeWeapon(weapon, item)
    return this.#importRangedWeapon(weapon, item)
  }

  /* ---------------------------------------- */

  #importMeleeWeapon(weapon: GcsWeapon, item: AnyGcsItem): DataModel.CreateData<MeleeAttackSchema> {
    const name = weapon.usage ?? ''
    const type = 'meleeAttack'
    const _id = foundry.utils.randomID()

    const parrybonus = this.input.calc.parry_bonus ?? 0
    const blockbonus = this.input.calc.parry_bonus ?? 0

    const component: DataModel.CreateData<MeleeAttackComponentSchema> = {
      name: item.name || '',
      pageref: '',
      mode: weapon.usage || '',
      notes: weapon.usage_notes || '',
      import: weapon.calc?.level || 0,
      damage: weapon.calc?.damage || '',
      st: weapon.calc?.strength || weapon.strength,
      reach: weapon.calc?.reach || weapon.reach,
      parry: weapon.calc?.parry || weapon.parry,
      parrybonus,
      block: weapon.calc?.block || weapon.block,
      blockbonus,
    }

    return {
      name,
      type,
      _id,
      mel: component,
    }
  }

  /* ---------------------------------------- */

  #importRangedWeapon(weapon: GcsWeapon, item: AnyGcsItem): DataModel.CreateData<RangedAttackSchema> {
    const name = weapon.usage ?? ''
    const type = 'rangedAttack'
    const _id = foundry.utils.randomID()

    const halfd = weapon.range?.includes('/') ? weapon.range.split('/')[0] : '0'

    const component: DataModel.CreateData<RangedAttackComponentSchema> = {
      name: item.name || '',
      pageref: '',
      mode: weapon.usage || '',
      notes: weapon.usage_notes || '',
      import: weapon.calc?.level || 0,
      damage: weapon.calc?.damage || '',
      st: weapon.calc?.strength || weapon.strength,
      acc: weapon.calc?.accuracy || weapon.accuracy,
      shots: weapon.calc?.shots || weapon.shots,
      range: weapon.calc?.range || weapon.range,
      rcl: weapon.calc?.recoil || weapon.recoil,
      halfd,
      rate_of_fire: weapon.calc?.rate_of_fire || weapon.rate_of_fire,
      bulk: weapon.calc?.bulk || weapon.bulk || '0',
    }

    return {
      name,
      type,
      _id,
      rng: component,
    }
  }

  /* ---------------------------------------- */

  #importTrait(trait: GcsTrait, index: number, containedBy?: string | undefined): Item.CreateData {
    const type = 'featureV2'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = trait.name ?? 'Trait'

    const system: DataModel.CreateData<TraitSchema> = this.#importItem(trait)
    system.disabled = trait.disabled
    system.containedBy = containedBy ?? null

    // Update any actions with the containing trait id:
    for (const action of Object.values(system.actions)) {
      // @ts-expect-error
      action.containedBy = _id
    }

    const component: DataModel.CreateData<TraitComponentSchema> = this.#importTraitComponent(trait)
    trait.childItems?.forEach((child: GcsTrait, childIndex: number) => this.#importTrait(child, childIndex, _id))

    // component.contains = children.map((c: Item.CreateData) => c._id as string)
    const item: Item.CreateData = {
      _id,
      type,
      name,
      sort: index,
      // @ts-expect-error
      system: {
        ...system,
        fea: component,
      },
    }

    this.items.push(item)
    return item
  }

  /* ---------------------------------------- */

  #importSkill(skill: GcsSkill, index: number, containedBy?: string | undefined): Item.CreateData {
    const type = 'skillV2'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = skill.name ?? 'Skill'

    const system: DataModel.CreateData<SkillSchema> = this.#importItem(skill)
    system.containedBy = containedBy ?? null

    const component: DataModel.CreateData<SkillComponentSchema> = this.#importSkillComponent(skill)
    skill.childItems?.forEach((child: GcsSkill, childIndex: number) => this.#importSkill(child, childIndex, _id))

    const item: Item.CreateData = {
      _id,
      type,
      name,
      sort: index,
      // @ts-expect-error
      system: {
        ...system,
        ski: component,
      },
    }

    this.items.push(item)
    return item
  }

  /* ---------------------------------------- */

  #importSpell(spell: GcsSpell, index: number, containedBy?: string | undefined): Item.CreateData {
    const type = 'spellV2'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = spell.name ?? 'Spell'

    const system: DataModel.CreateData<SpellSchema> = this.#importItem(spell)
    system.containedBy = containedBy ?? null

    // Update any actions with the containing trait id:
    for (const action of Object.values(system.actions)) {
      // @ts-expect-error
      action.containedBy = _id
    }

    const component: DataModel.CreateData<SpellComponentSchema> = this.#importSpellComponent(spell)

    spell.childItems?.forEach((child: GcsSpell, childIndex: number) => this.#importSpell(child, childIndex, _id))

    const item: Item.CreateData = {
      _id,
      type,
      name,
      sort: index,
      // @ts-expect-error
      system: {
        ...system,
        spl: component,
      },
    }

    this.items.push(item)
    return item
  }

  /* ---------------------------------------- */

  #importEquipment(
    equipment: GcsEquipment,
    index: number,
    carried: boolean,
    containedBy?: string | undefined
  ): Item.CreateData {
    const type = 'equipmentV2'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = equipment.name ?? 'Equipment'

    const system: DataModel.CreateData<EquipmentSchema> = this.#importItem(equipment)
    system.containedBy = containedBy ?? null

    // Update any actions with the containing trait id:
    for (const action of Object.values(system.actions)) {
      // @ts-expect-error
      action.containedBy = _id
    }

    const component: DataModel.CreateData<EquipmentComponentSchema> = this.#importEquipmentComponent(equipment, carried)

    equipment.childItems?.forEach((child: GcsEquipment, childIndex: number) =>
      this.#importEquipment(child, childIndex, carried, _id)
    )

    const item: Item.CreateData = {
      _id,
      type,
      name,
      sort: index,
      // @ts-expect-error
      system: {
        ...system,
        eqt: component,
      },
    }

    this.items.push(item)
    return item
  }

  /* ---------------------------------------- */

  #importBaseComponent(item: AnyGcsItem): DataModel.CreateData<ItemComponentSchema> {
    const component: DataModel.CreateData<ItemComponentSchema> = {
      name: item.name,
      notes: item.calc?.resolved_notes || item.local_notes || item.notes || '',
      pageref: item.reference ?? '',
      vtt_notes: item.vtt_notes ?? null,
    }
    return component
  }

  /* ---------------------------------------- */

  #importTraitComponent(trait: GcsTrait): DataModel.CreateData<TraitComponentSchema> {
    // console.log('Importing trait component', trait)

    return {
      ...this.#importBaseComponent(trait),
      cr: trait.cr ?? null,
      level: trait.levels ?? 0,
      userdesc: trait.userdesc ?? '',
      points: trait.calc?.points ?? 0,
    }
  }

  /* ---------------------------------------- */

  #importSkillComponent(skill: GcsSkill): DataModel.CreateData<SkillComponentSchema> {
    return {
      ...this.#importBaseComponent(skill),
      points: skill.points ?? 0,
      type: skill.difficulty ?? '',
      relativelevel: skill.calc?.rsl ?? '',
      import: skill.calc?.level ?? 0,
      specialization: skill.specialization ?? '',
      techlevel: skill.tech_level ?? '',
    }
  }

  /* ---------------------------------------- */

  #importSpellComponent(spell: GcsSpell): DataModel.CreateData<SpellComponentSchema> {
    return {
      ...this.#importBaseComponent(spell),
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
    }
  }

  /* ---------------------------------------- */

  #importEquipmentComponent(equipment: GcsEquipment, carried: boolean): DataModel.CreateData<EquipmentComponentSchema> {
    // Get the correct weight value. I'm guessing that weight should be equal to calc.weight unless that field is "",
    // otherwise it should be calc.extended_weight.
    const weight = equipment.calc?.weight
      ? parseFloat(equipment.calc.weight)
      : parseFloat(equipment.calc?.extended_weight || '0')

    return {
      ...this.#importBaseComponent(equipment),
      count: equipment.quantity ?? 1,
      weight,
      cost: equipment.calc?.value ?? 0,
      location: '',
      carried,
      equipped: equipment.equipped ?? false,
      techlevel: equipment.tech_level ?? '',
      categories: equipment.tags?.join(', ') ?? '',
      costsum: equipment.calc?.extended_value || 0,
      weightsum: equipment.calc?.extended_weight,
      uses: equipment.uses ?? 0,
      maxuses: equipment.max_uses ?? 0,
    }
  }

  /* ---------------------------------------- */

  #createStandardTrackers() {
    this.output.additionalresources ||= {}
    this.output.additionalresources.tracker ||= []

    // Placeholder for adding standard trackers to the character.
  }
}

export { GcsImporter }
