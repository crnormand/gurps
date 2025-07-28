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
import { HitLocationSchema } from 'module/actor/data/hit-location-entry.js'

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

  static async importCharacter(input: GcsCharacter): Promise<void> {
    return await new GcsImporter(input).#importCharacter()
  }

  /* ---------------------------------------- */

  async #importCharacter() {
    const _id = foundry.utils.randomID()
    const type = 'character'
    const name = this.input.profile.name ?? 'Imported Character'

    this.#importPortrait()
    this.#importAttributes()
    this.#importProfile()
    this.#importHitLocations()
    this.#importItems()
    this.#importPointTotals()
    this.#importMiscValues()

    console.log({
      _id,
      name,
      type,
      system: this.output,
      items: this.items,
    })

    await Actor.create({
      _id,
      name,
      type,
      img: this.img,
      // FIXME: not sure why this is not resolving correctly
      system: this.output as any,
      items: this.items as any,
    })
  }

  /* ---------------------------------------- */

  #importPortrait() {
    if (game.user?.hasPermission('FILES_UPLOAD')) {
      this.img = `data:image/png;base64,${this.input.profile.portrait}.png`
    }
  }

  /* ---------------------------------------- */

  #importAttributes() {
    this.output.attributes = { ST: {}, DX: {}, IQ: {}, HT: {} }
    for (let key of ['ST', 'DX', 'IQ', 'HT', 'QN', 'WILL', 'PERCEPTION'] as const) {
      const attribute = this.input.attributes.find(attr => attr.attr_id === key.toLowerCase())
      if (attribute) {
        this.output.attributes[key === 'PERCEPTION' ? 'PER' : key] = {
          import: attribute.calc.value,
          points: attribute.calc.points,
        }
      } else {
        this.output.attributes[key === 'PERCEPTION' ? 'PER' : key] = {
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

    this.output.hitlocations = []
    this.input.settings.body_type.locations.forEach(location => {
      const split = { ...(location.calc.dr as Record<string, number>) }
      delete split.all // Remove the 'all' key, as it is already present in the 'import' field

      const newLocation: DataModel.CreateData<HitLocationSchema> = {
        where: location.table_name ?? '',
        import: (location.calc.dr as Record<string, number>).all ?? 0,
        penalty: location.hit_penalty ?? 0,
        rollText: location.calc.roll_range ?? '-',
        split,
      }

      ;(this.output.hitlocations as DataModel.CreateData<HitLocationSchema>[]).push(newLocation)
    })
  }

  /* ---------------------------------------- */

  #importItems() {
    this.input.traits?.forEach(trait => this.#importTrait(trait))
    this.input.skills?.forEach(skill => this.#importSkill(skill))
    this.input.spells?.forEach(spell => this.#importSpell(spell))
    this.input.equipment?.forEach(equipment => this.#importEquipment(equipment, true))
    this.input.other_equipment?.forEach(equipment => this.#importEquipment(equipment, false))
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
    let parry = 0
    for (const weapon of this.input.allEquippedWeapons.filter(e => e.isMelee)) {
      let weaponParry = parseInt(weapon.calc.parry ?? weapon.parry ?? '0')
      if (isNaN(weaponParry)) weaponParry = 0
      if (weaponParry > parry) parry = weaponParry
    }
    this.output.parry = parry

    let race = 'Human'
    const ancestryTrait = this.input.traits?.find(trait => trait.container_type === 'ancestry')
    if (ancestryTrait) {
      race = ancestryTrait.name ?? 'Human'
    }

    this.output.traits!.race = race
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

  #importItem(item: AnyGcsItem, carried = true): DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> {
    const system: DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> = { actions: {} }
    system.isContainer = item.isContainer

    system.actions = item.weaponItems
      ?.map((action: GcsWeapon) => this.#importWeapon(action, item))
      ?.filter(
        (weapon): weapon is DataModel.CreateData<MeleeAttackSchema | RangedAttackSchema> & { _id: string } =>
          weapon._id && typeof weapon._id === 'string'
      )
      .map(weapon => [weapon._id, weapon])
      .reduce((entries, pair) => {
        if (!pair[0]) {
          console.error('GURPS | Failed to import weapon: No _id set.')
          console.error(pair[1])
          return entries;
        }
        return Object.fromEntries(entries)
      })

    if (item instanceof GcsEquipment) {
      system.equipped = item.equipped ?? false
      system.carried = carried
    }

    if (!(item instanceof GcsSpell)) {
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
    }

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
      import: weapon.calc.level || 0,
      damage: weapon.calc.damage,
      st: weapon.calc.strength || weapon.strength,
      reach: weapon.calc.reach || weapon.reach,
      parry: weapon.calc.parry || weapon.parry,
      parrybonus,
      block: weapon.calc.block || weapon.block,
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
      import: weapon.calc.level,
      damage: weapon.calc.damage,
      st: weapon.calc.strength || weapon.strength,
      acc: weapon.calc.accuracy || weapon.accuracy,
      shots: weapon.calc.shots || weapon.shots,
      range: weapon.calc.range || weapon.range,
      rcl: weapon.calc.recoil || weapon.recoil,
      halfd,
    }

    return {
      name,
      type,
      _id,
      rng: component,
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
    const name = equipment.name ?? 'Equipment'

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
      name: item.name,
      notes: item.calc.resolved_notes ?? '',
      pageref: item.reference ?? '',
    }
    return component
  }

  /* ---------------------------------------- */

  #importTraitComponent(trait: GcsTrait): DataModel.CreateData<TraitComponentSchema> {
    return {
      ...this.#importBaseComponent(trait),
      cr: trait.cr ?? 0,
      level: trait.levels ?? 0,
      userdesc: trait.userdesc ?? '',
      points: trait.calc.points ?? 0,
    }
  }

  /* ---------------------------------------- */

  #importSkillComponent(skill: GcsSkill): DataModel.CreateData<SkillComponentSchema> {
    return {
      ...this.#importBaseComponent(skill),
      points: skill.points ?? 0,
      type: skill.difficulty ?? '',
      relativelevel: skill.calc.rsl ?? '',
      import: skill.calc.level ?? 0,
    }
  }

  /* ---------------------------------------- */

  #importSpellComponent(spell: GcsSpell): DataModel.CreateData<SpellComponentSchema> {
    return {
      ...this.#importBaseComponent(spell),
      points: spell.points ?? 0,
      difficulty: spell.difficulty ?? '',
      relativelevel: spell.calc.rsl ?? '',
      import: spell.calc.level ?? 0,
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

  #importEquipmentComponent(
    equipment: GcsEquipment,
    equipped: boolean
  ): DataModel.CreateData<EquipmentComponentSchema> {
    return {
      ...this.#importBaseComponent(equipment),
      count: equipment.quantity ?? 1,
      weight: parseInt(equipment.calc.weight) || 0,
      cost: equipment.calc.value ?? 0,
      location: '',
      carried: true,
      equipped,
      techlevel: equipment.tech_level ?? '',
      categories: equipment.tags?.join(', ') ?? '',
      costsum: equipment.calc.extended_value,
      weightsum: equipment.calc.extended_weight,
      uses: equipment.uses ?? 0,
      maxuses: equipment.max_uses ?? 0,
    }
  }
}

export { GcsImporter }
