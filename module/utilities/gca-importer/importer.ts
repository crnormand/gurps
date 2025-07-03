import { GCAAttackMode, GCACharacter, GCATrait } from './gca-schema.js'
import DataModel = foundry.abstract.DataModel
import { CharacterSchema } from 'module/actor/data/character.js'
import { BaseItemModel } from 'module/item/data/base.js'
import {
  MeleeAttackComponentSchema,
  MeleeAttackSchema,
  RangedAttackComponentSchema,
  RangedAttackSchema,
} from 'module/action/index.js'
import { TraitComponentSchema, TraitSchema } from 'module/item/data/trait.js'
import { SpellComponentSchema, SpellSchema } from 'module/item/data/spell.js'
import { ItemComponentSchema } from 'module/item/data/component.js'
import { EquipmentSchema, EquipmentComponentSchema } from 'module/item/data/equipment.js'
import { SkillSchema, SkillComponentSchema } from 'module/item/data/skill.js'
import { HitLocationSchema } from 'module/actor/data/hit-location-entry.js'

// TODO: get rid of when this is migrated
import * as HitLocations from '../../hitlocation/hitlocation.js'

class GcaImporter {
  input: GCACharacter
  output: DataModel.CreateData<CharacterSchema>
  items: DataModel.CreateData<DataModel.SchemaOf<GCATrait>>[]
  img: string

  /* ---------------------------------------- */

  constructor(input: GCACharacter) {
    this.input = input
    this.output = {}

    this.items = []
    this.img = ''
  }

  /* ---------------------------------------- */

  static async importCharacter(input: GCACharacter): Promise<void> {
    return await new GcaImporter(input).#importCharacter()
  }

  /* ---------------------------------------- */

  async #importCharacter() {
    const _id = foundry.utils.randomID()
    const type = 'character'
    const name = this.input.name ?? 'Imported Character'

    this.#importPortrait()
    this.#importAttributes()
    this.#importProfile()
    this.#importHitLocations()
    this.#importItems()
    this.#importPointTotals()

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
      this.img = `data:image/png;base65,${this.input.vitals.portraitimage}.png`
    }
  }

  /* ---------------------------------------- */

  #importAttributes() {
    this.output.attributes = { ST: {}, DX: {}, IQ: {}, HT: {} }
    for (let key of ['ST', 'DX', 'IQ', 'HT', 'QN', 'WILL', 'PERCEPTION'] as const) {
      const attribute = this.input.traits.attributes.find(attr => attr.name.toLowerCase() === key.toLowerCase())
      if (attribute) {
        this.output.attributes[key === 'PERCEPTION' ? 'PER' : key] = {
          value: attribute.score,
          points: attribute.points,
        }
      } else {
        this.output.attributes[key === 'PERCEPTION' ? 'PER' : key] = {
          value: 10,
          points: 0,
        }
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

    const parry = this.input.traits.attributes.find(attr => attr.name === 'Parry')
    this.output.parry = parry?.score ?? 0

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

    // FIXME: GCA does not store these, so they will need to be calculated dynamically from Striking ST
    this.output.thrust = '1d-1'
    this.output.swing = '1d+1'
  }

  #importProfile() {
    const { vitals } = this.input

    const SM = this.input.traits.attributes.find(attr => attr.symbol === 'SM')
    const TL = this.input.traits.attributes.find(attr => attr.symbol === 'TL')

    this.output.traits = {
      title: '',
      height: vitals.height ?? '',
      weight: vitals.weight ?? '',
      age: vitals.age ?? '',
      race: vitals.race ?? '',
      birthday: '',
      religion: '',
      gender: '',
      eyes: '',
      hair: '',
      hand: '',
      skin: '',
      sizemod: SM?.score ?? 0,
      techlevel: `${TL?.score ?? 0}`,
      createdon: this.input.author.datecreated ?? '',
      modifiedon: '',
      player: this.input.player ?? '',
    }
  }

  /* ---------------------------------------- */

  #importHitLocations() {
    this.output.additionalresources ||= {}
    this.output.additionalresources.bodyplan = this.input.bodytype ?? 'Humanoid'

    const table = HitLocations.hitlocationDictionary?.[this.input.bodytype ?? 'Humanoid']
    this.output.hitlocations = []
    this.input.body?.forEach(location => {
      if (location.display === 0) return // Skip hidden locations

      let roll = ''

      if (table) {
        const [_, standardEntry] = HitLocations.HitLocation.findTableEntry(table, location.name)
        if (standardEntry) {
          roll = standardEntry.roll
        }
      }

      const newLocation: DataModel.CreateData<HitLocationSchema> = {
        where: location.name ?? '',
        import: parseInt(location.dr) ?? 0,
        rollText: roll,
      }

      ;(this.output.hitlocations as DataModel.CreateData<HitLocationSchema>[]).push(newLocation)
    })
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

  #importItem(item: GCATrait): DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> {
    const system: DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> = {}

    system.actions = item.attackmodes
      ?.map((action: GCAAttackMode) => this.#importWeapon(action, item))
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
    return system
  }

  /* ---------------------------------------- */

  #importWeapon(weapon: GCAAttackMode, item: GCATrait): DataModel.CreateData<MeleeAttackSchema | RangedAttackSchema> {
    if (weapon.reach !== null) return this.#importMeleeWeapon(weapon, item)
    return this.#importRangedWeapon(weapon, item)
  }

  /* ---------------------------------------- */

  #importMeleeWeapon(weapon: GCAAttackMode, item: GCATrait): DataModel.CreateData<MeleeAttackSchema> {
    const name = weapon.name ?? ''
    const type = 'meleeAttack'
    const _id = foundry.utils.randomID()

    const component: DataModel.CreateData<MeleeAttackComponentSchema> = {
      name: item.name,
      notes: weapon.notes ?? '',
      pageref: '',
      mode: weapon.name ?? '',
      import: weapon.charskillscore ?? 0,
      damage: weapon.chardamage ?? '',
      st: weapon.charminst ?? '',
      reach: weapon.charreach ?? '',
      parry: weapon.charparry ?? '',
      // FIXME: currently no way to get block value from base data. May need to be calculated.
      block: '',
    }

    return {
      name,
      type,
      _id,
      ...component,
    }
  }

  #importRangedWeapon(weapon: GCAAttackMode, item: GCATrait): DataModel.CreateData<RangedAttackSchema> {
    const name = weapon.name ?? ''
    const type = 'rangedAttack'
    const _id = foundry.utils.randomID()

    const component: DataModel.CreateData<RangedAttackComponentSchema> = {
      name: item.name ?? '',
      notes: weapon.notes ?? '',
      pageref: '',
      mode: weapon.name ?? '',
      import: weapon.charskillscore ?? 0,
      damage: weapon.chardamage ?? '',
      st: weapon.charminst ?? '',
      acc: weapon.characc ?? '',
      range: weapon.charrangemax ?? '',
      shots: weapon.charshots ?? '',
      rcl: weapon.charrcl ?? '',
      halfd: weapon.charrangehalfdam ?? '',
    }

    return {
      name,
      type,
      _id,
      ...component,
    }
  }

  /* ---------------------------------------- */

  #importTrait(trait: GCATrait): Item.CreateData {
    const type = 'feature'
    const _id = foundry.utils.randomID()

    let name = trait.name ?? 'Trait'
    const crRegex = /\[\s*CR: (\d{1,2})\s*\]/i

    const system: DataModel.CreateData<TraitSchema> = this.#importItem(trait)
    const component: DataModel.CreateData<TraitComponentSchema> = this.#importTraitComponent(trait)

    if (crRegex.test(name)) {
      component.cr = parseInt(name.match(crRegex)?.[1] ?? '0')
      name = name.replace(crRegex, '').trim()
    }

    const children =
      trait
        .getChildren([
          ...this.input.traits.advantages,
          ...this.input.traits.disadvantages,
          ...this.input.traits.perks,
          ...this.input.traits.quirks,
          ...this.input.traits.cultures,
          ...this.input.traits.languages,
        ])
        ?.map((child: GCATrait) => this.#importTrait(child)) ?? []
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

  #importSkill(skill: GCATrait): Item.CreateData {
    const type = 'skill'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = skill.name ?? 'Skill'

    const system: DataModel.CreateData<SkillSchema> = this.#importItem(skill)
    const component: DataModel.CreateData<SkillComponentSchema> = this.#importSkillComponent(skill)

    const children =
      skill.getChildren(this.input.traits.skills)?.map((child: GCATrait) => this.#importSkill(child)) ?? []
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

  #importSpell(spell: GCATrait): Item.CreateData {
    const type = 'spell'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = spell.name ?? 'Spell'

    const system: DataModel.CreateData<SpellSchema> = this.#importItem(spell)
    const component: DataModel.CreateData<SpellComponentSchema> = this.#importSpellComponent(spell)

    const children =
      spell.getChildren(this.input.traits.spells)?.map((child: GCATrait) => this.#importSpell(child)) ?? []
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

  #importEquipment(equipment: GCATrait): Item.CreateData {
    const type = 'equipment'
    const _id = foundry.utils.randomID()
    const name = equipment.name ?? 'Equipment'

    const system: DataModel.CreateData<EquipmentSchema> = this.#importItem(equipment)
    const component: DataModel.CreateData<EquipmentComponentSchema> = this.#importEquipmentComponent(equipment)

    const children =
      equipment.getChildren(this.input.traits.equipment)?.map((child: GCATrait) => this.#importEquipment(child)) ?? []
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

  #importBaseComponent(item: GCATrait): DataModel.CreateData<ItemComponentSchema> {
    const component: DataModel.CreateData<ItemComponentSchema> = {
      name: item.name ?? '',
      notes: item.ref?.notes ?? '',
      pageref: item.ref?.page ?? '',
    }
    return component
  }

  /* ---------------------------------------- */

  #importTraitComponent(trait: GCATrait): DataModel.CreateData<TraitComponentSchema> {
    const component: DataModel.CreateData<TraitComponentSchema> = this.#importBaseComponent(trait)

    Object.assign(component, {
      cr: 0,
      level: trait.level ?? 0,
      userdesc: trait.ref?.description ?? '',
      points: trait.points ?? 0,
    })

    return component
  }

  /* ---------------------------------------- */

  #importSkillComponent(skill: GCATrait): DataModel.CreateData<SkillComponentSchema> {
    const component: DataModel.CreateData<SkillComponentSchema> = this.#importBaseComponent(skill)
    Object.assign(component, {
      points: skill.points ?? 0,
      type: skill.type ?? '',
      relativelevel: `${skill.stepoff}${skill.step}`,
      import: skill.level ?? 0,
    })

    return component
  }

  /* ---------------------------------------- */

  #importSpellComponent(spell: GCATrait): DataModel.CreateData<SpellComponentSchema> {
    const component: DataModel.CreateData<SpellComponentSchema> = this.#importBaseComponent(spell)

    let spellClass = ''
    let spellResist = ''
    if (spell.ref?.class?.includes('/')) {
      ;[spellClass, spellResist] = spell.ref.class.split('/')
    } else {
      spellClass = spell.ref.class ?? ''
    }

    let spellCost = ''
    let spellMaintain = ''
    if (spell.ref?.castingcost?.includes('/')) {
      ;[spellCost, spellMaintain] = spell.ref.castingcost.split('/')
    } else {
      spellCost = spell.ref.castingcost ?? ''
      spellMaintain = spell.ref.castingcost ?? ''
    }

    Object.assign(component, {
      points: spell.points ?? 0,
      type: spell.type ?? '',
      relativelevel: `${spell.stepoff}${spell.step}`,
      import: spell.level ?? 0,
      class: spellClass,
      college: spell.cat ?? '',
      cost: spellCost,
      maintain: spellMaintain,
      duration: spell.ref?.duration ?? '',
      resist: spellResist,
      casttime: spell.ref?.time ?? '',
    })

    return component
  }

  /* ---------------------------------------- */

  #importEquipmentComponent(equipment: GCATrait): DataModel.CreateData<EquipmentComponentSchema> {
    const component: DataModel.CreateData<EquipmentComponentSchema> = this.#importBaseComponent(equipment)
    Object.assign(component, {
      count: equipment.count ?? 1,
      weight: equipment.calcs.postformulaweight ?? '',
      cost: equipment.calcs.postformulacost ?? 0,
      location: '',
      carried: true,
      equipped: true,
      techlevel: equipment.tl ?? '',
      categories: equipment.cat,
      costsum: equipment.calcs.postchildrencost ?? 0,
      weightsum: equipment.calcs.postchildrenweight ?? '',
      uses: 0,
      maxuses: 0,
    })

    return component
  }
}

/* ---------------------------------------- */

export { GcaImporter }
