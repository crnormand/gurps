import DataModel = foundry.abstract.DataModel

import { CharacterSchema } from '../../actor/data/character.js'
import { GcsCharacter } from './schema/character.js'
import { GcsItem } from './schema/base.js'
import { TraitComponentSchema, TraitSchema } from 'module/item/data/trait.js'
import { BaseItemModel } from 'module/item/data/base.js'
import { GcsTrait } from './schema/trait.js'
import { ItemComponentSchema } from 'module/item/data/component.js'
import { AnyGcsItem } from './schema/index.js'
import { GcsEquipment } from './schema/equipment.js'
import { MeleeAttackComponentSchema, MeleeAttackSchema } from '../../action/melee-attack.js'
import { RangedAttackComponentSchema, RangedAttackSchema } from '../../action/ranged-attack.js'
import { GcsWeapon } from './schema/weapon.js'
import { SkillComponentSchema, SkillSchema } from '../../item/data/skill.js'
import { GcsSkill } from './schema/skill.js'
import { SpellComponentSchema, SpellSchema } from '../../item/data/spell.js'
import { GcsSpell } from './schema/spell.js'
import { EquipmentSchema, EquipmentComponentSchema } from '../../item/data/equipment.js'

class GcsImporter {
  input: GcsCharacter
  output: DataModel.CreateData<CharacterSchema>
  items: DataModel.CreateData<DataModel.SchemaOf<GcsItem<any>>>[]

  /* ---------------------------------------- */

  constructor(input: GcsCharacter) {
    this.input = input
    this.output = {}

    this.items = []
  }

  /* ---------------------------------------- */

  static importCharacter(input: GcsCharacter) {
    return new GcsImporter(input).#importCharacter()
  }

  /* ---------------------------------------- */

  #importCharacter() {
    // Measure how long importing takes
    const startTime = performance.now()

    const _id = foundry.utils.randomID()
    const type = 'character'
    const name = this.input.profile.name ?? 'Imported Character'

    this.#importAttributes()
    this.#importProfile()
    this.#importItems()

    console.log({
      _id,
      name,
      type,
      system: this.output,
      items: this.items,
    })

    Actor.create({
      _id,
      name,
      type,
      system: this.output,
      items: this.items,
    })

    console.log(`Took ${Math.round(performance.now() - startTime)}ms to import.`)
  }

  /* ---------------------------------------- */

  #importAttributes() {
    this.output.attributes = { ST: {}, DX: {}, IQ: {}, HT: {} }
    for (let key of ['ST', 'DX', 'IQ', 'HT', 'QN', 'WILL', 'PERCEPTION'] as const) {
      const attribute = this.input.attributes.find(attr => attr.attr_id === key.toLowerCase())
      if (attribute) {
        this.output.attributes[key === 'PERCEPTION' ? 'PER' : key] = {
          value: attribute.calc.value,
          points: attribute.calc.points,
        }
      } else {
        this.output.attributes[key === 'PERCEPTION' ? 'PER' : key] = {
          value: 10,
          points: 0,
        }
      }
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
  }

  /* ---------------------------------------- */

  #importProfile() {
    // TODO: add race
    // ensure SM bonuses are respected

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

  #importItems() {
    this.input.traits?.forEach(trait => this.#importTrait(trait))
    this.input.skills?.forEach(skill => this.#importSkill(skill))
    this.input.spells?.forEach(spell => this.#importSpell(spell))
    this.input.equipment?.forEach(equipment => this.#importEquipment(equipment, true))
    this.input.other_equipment?.forEach(equipment => this.#importEquipment(equipment, false))
  }

  /* ---------------------------------------- */

  #importItem(item: AnyGcsItem, carried = true): DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> {
    const system: DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> = {}

    system.actions = item.weapons?.map(action => this.#importWeapon(action)) ?? []

    if (item instanceof GcsEquipment) {
      system.equipped = item.equipped ?? false
      system.carried = carried
    }

    return system
  }

  /* ---------------------------------------- */

  #importWeapon(weapon: GcsWeapon): DataModel.CreateData<MeleeAttackSchema | RangedAttackSchema> {
    if (weapon.id.startsWith('w')) return this.#importMeleeWeapon(weapon)
    return this.#importRangedWeapon(weapon)
  }

  /* ---------------------------------------- */

  #importMeleeWeapon(weapon: GcsWeapon): DataModel.CreateData<MeleeAttackSchema> {
    const name = weapon.usage ?? ''
    const type = 'meleeAttack'
    const _id = foundry.utils.randomID()

    const component: DataModel.CreateData<MeleeAttackComponentSchema> = {
      // TODO: add parent item name
      name: '',
      notes: weapon.usage_notes ?? '',
      pageref: '',
      mode: weapon.usage ?? '',
      import: weapon.calc.level,
      damage: weapon.calc.damage,
      st: weapon.calc.strength ?? weapon.strength,
      reach: weapon.calc.reach ?? weapon.reach,
      parry: weapon.calc.parry ?? weapon.parry,
      block: weapon.calc.block ?? weapon.block,
    }

    return {
      name,
      type,
      _id,
      ...component,
    }
  }

  #importRangedWeapon(weapon: GcsWeapon): DataModel.CreateData<RangedAttackSchema> {
    const name = weapon.usage ?? ''
    const type = 'rangedAttack'
    const _id = foundry.utils.randomID()

    const halfd = weapon.range?.includes('/') ? weapon.range.split('/')[0] : '0'

    const component: DataModel.CreateData<RangedAttackComponentSchema> = {
      // TODO: add parent item name
      name: '',
      notes: weapon.usage_notes ?? '',
      pageref: '',
      mode: weapon.usage ?? '',
      import: weapon.calc.level,
      damage: weapon.calc.damage,
      st: weapon.calc.strength ?? weapon.strength,
      acc: weapon.calc.accuracy ?? weapon.accuracy,
      range: weapon.calc.range ?? weapon.range,
      shots: weapon.calc.shots ?? weapon.shots,
      rcl: weapon.calc.recoil ?? weapon.recoil,
      halfd,
    }

    return {
      name,
      type,
      _id,
      ...component,
    }
  }

  /* ---------------------------------------- */

  #importTrait(trait: GcsTrait): Item.CreateData {
    const type = 'feature'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = trait.name ?? 'Trait'

    const system: DataModel.CreateData<TraitSchema> = this.#importItem(trait)
    const component: DataModel.CreateData<TraitComponentSchema> = this.#importTraitComponent(trait)

    const children = trait.childItems?.map((child: GcsTrait) => this.#importTrait(child)) ?? []
    component.contains = children.map((c: Item.CreateData) => c._id as string)

    const item: Item.CreateData = {
      _id,
      type,
      name,
      system: {
        ...system,
        fea: component,
      },
    }

    this.items.push(item)
    return item
  }

  /* ---------------------------------------- */

  #importSkill(skill: GcsSkill): Item.CreateData {
    const type = 'skill'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = skill.name ?? 'Skill'

    const system: DataModel.CreateData<SkillSchema> = this.#importItem(skill)
    const component: DataModel.CreateData<SkillComponentSchema> = this.#importSkillComponent(skill)

    const children = skill.childItems?.map((child: GcsSkill) => this.#importSkill(child)) ?? []
    component.contains = children.map((c: Item.CreateData) => c._id as string)

    const item: Item.CreateData = {
      _id,
      type,
      name,
      system: {
        ...system,
        ski: component,
      },
    }

    this.items.push(item)
    return item
  }

  /* ---------------------------------------- */

  #importSpell(spell: GcsSpell): Item.CreateData {
    const type = 'spell'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = spell.name ?? 'Spell'

    const system: DataModel.CreateData<SpellSchema> = this.#importItem(spell)
    const component: DataModel.CreateData<SpellComponentSchema> = this.#importSpellComponent(spell)

    const children = spell.childItems?.map((child: GcsSpell) => this.#importSpell(child)) ?? []
    component.contains = children.map((c: Item.CreateData) => c._id as string)

    const item: Item.CreateData = {
      _id,
      type,
      name,
      system: {
        ...system,
        spl: component,
      },
    }

    this.items.push(item)
    return item
  }

  /* ---------------------------------------- */

  #importEquipment(equipment: GcsEquipment, equipped: boolean): Item.CreateData {
    const type = 'equipment'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = equipment.description ?? 'Equipment'

    const system: DataModel.CreateData<EquipmentSchema> = this.#importItem(equipment)
    const component: DataModel.CreateData<EquipmentComponentSchema> = this.#importEquipmentComponent(
      equipment,
      equipped
    )

    const children = equipment.childItems?.map((child: GcsEquipment) => this.#importEquipment(child, equipped)) ?? []
    component.contains = children.map((c: Item.CreateData) => c._id as string)

    const item: Item.CreateData = {
      _id,
      type,
      name,
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
      name: item instanceof GcsEquipment ? item.description : (item.name ?? ''),
      notes: item.calc.resolved_notes ?? '',
      pageref: item.reference ?? '',
    }
    return component
  }

  /* ---------------------------------------- */

  #importTraitComponent(trait: GcsTrait): DataModel.CreateData<TraitComponentSchema> {
    const component: DataModel.CreateData<TraitComponentSchema> = this.#importBaseComponent(trait)
    Object.assign(component, {
      cr: trait.cr ?? 0,
      level: trait.levels ?? 0,
      userdesc: trait.userdesc ?? '',
      points: trait.calc.points ?? 0,
    })

    return component
  }

  /* ---------------------------------------- */

  #importSkillComponent(skill: GcsSkill): DataModel.CreateData<SkillComponentSchema> {
    const component: DataModel.CreateData<SkillComponentSchema> = this.#importBaseComponent(skill)
    Object.assign(component, {
      points: skill.points ?? 0,
      type: skill.difficulty ?? '',
      relativelevel: skill.calc.rsl ?? '',
      import: skill.calc.level ?? 0,
    })

    return component
  }

  /* ---------------------------------------- */

  #importSpellComponent(spell: GcsSpell): DataModel.CreateData<SpellComponentSchema> {
    const component: DataModel.CreateData<SpellComponentSchema> = this.#importBaseComponent(spell)
    Object.assign(component, {
      points: spell.points ?? 0,
      type: spell.difficulty ?? '',
      relativelevel: spell.calc.rsl ?? '',
      import: spell.calc.level ?? 0,
      class: spell.spell_class ?? '',
      college: spell.college ?? '',
      cost: spell.casting_cost ?? 0,
      maintain: spell.maintenance_cost ?? 0,
      duration: spell.duration ?? '',
      resist: spell.resist ?? '',
      casttime: spell.casting_time ?? '',
    })

    return component
  }

  /* ---------------------------------------- */

  #importEquipmentComponent(
    equipment: GcsEquipment,
    equipped: boolean
  ): DataModel.CreateData<EquipmentComponentSchema> {
    const component: DataModel.CreateData<EquipmentComponentSchema> = this.#importBaseComponent(equipment)
    Object.assign(component, {
      count: equipment.quantity ?? 1,
      weight: equipment.calc.weight,
      cost: equipment.calc.value ?? 0,
      location: '',
      carried: true,
      equipped,
      techlevel: equipment.tech_level ?? '',
      categories: equipment.tags ?? '',
      costsum: equipment.calc.extended_value,
      weightsum: equipment.calc.extended_weight,
      uses: equipment.uses,
      maxuses: equipment.max_uses,
    })

    return component
  }
}

export { GcsImporter }
