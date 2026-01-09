import { GCAAttackMode, GCACharacter, GCATrait } from './schema.js'
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
import { HitLocationSchemaV2 } from 'module/actor/data/hit-location-entry.js'
import { ImportSettings } from '../index.js'

// TODO: get rid of when this is migrated
import * as HitLocations from '../../hitlocation/hitlocation.js'

class GcaImporter {
  actor?: Actor.OfType<'characterV2'>
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

  static async importCharacter(
    input: GCACharacter,
    actor?: Actor.OfType<'characterV2'>
  ): Promise<Actor.OfType<'characterV2'>> {
    return await new GcaImporter(input).#importCharacter(actor)
  }

  /* ---------------------------------------- */

  async #importCharacter(actor?: Actor.OfType<'characterV2'>) {
    const _id = foundry.utils.randomID()
    const type = 'character'
    const name = this.input.name ?? 'Imported Character'

    // Set actor as a GcsImporter property for easier reference.
    if (actor) this.actor = actor

    this.#importPortrait()
    this.#importAttributes()
    this.#importProfile()
    this.#importHitLocations()
    this.#importItems()
    this.#importPointTotals()

    if (actor) {
      // When importing into existing actor, save count and uses for equipment with ignoreImportQty flag
      const savedEquipmentCounts = this.#saveEquipmentCountsIfNecessary(
        actor.items.contents.filter(item => item.type === 'equipmentV2') as Item.OfType<'equipmentV2'>[]
      )

      // When importing into existing actor, delete only imported items
      await this.#deleteImportedItems(actor)

      // Update actor with new system data and create new items
      await actor.update({
        name,
        img: this.img,
        system: this.output as any,
      })

      // Restore saved counts and uses in raw item data before creating embedded documents
      this.#restoreEquipmentCountsAndUses(savedEquipmentCounts)

      await actor.createEmbeddedDocuments('Item', this.items as any, { keepId: true })
    } else {
      actor = (await Actor.create({
        _id,
        name,
        type,
        img: this.img,
        system: this.output as any,
        items: this.items as any,
      })) as Actor.OfType<'characterV2'> | undefined
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
        const eqt = (itemData as any).system?.eqt
        if (eqt && eqt.importid && savedEquipmentCounts.has(eqt.importid)) {
          eqt.count = savedEquipmentCounts.get(eqt.importid)!.quantity
          eqt.uses = savedEquipmentCounts.get(eqt.importid)!.uses
          eqt.ignoreImportQty = true
        }
      }
    }
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
      const component =
        (item.system as any).fea ?? (item.system as any).ski ?? (item.system as any).spl ?? (item.system as any).eqt
      return ['GCS', 'GCA'].includes(component?.importFrom)
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
      const eqt = (item.system as any).eqt
      if (eqt && eqt.importFrom === 'GCA' && eqt.ignoreImportQty && eqt.importid) {
        savedEquipmentCounts.set(eqt.importid, { quantity: eqt.count, uses: eqt.uses })
      }
    })
    return savedEquipmentCounts
  }

  /* ---------------------------------------- */

  #importPortrait() {
    if (this.actor) {
      // If actor exists, assume we're keeping the current portrait unless otherwise specified
      this.img = this.actor.img ?? ''

      if (!ImportSettings.overwritePortrait) return
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

    this.img = `data:image/png;base64,${this.input.vitals?.portraitimage}.png`
  }

  /* ---------------------------------------- */

  #importAttributes() {
    this.output.attributes = { ST: {}, DX: {}, IQ: {}, HT: {} }
    for (let key of ['ST', 'DX', 'IQ', 'HT', 'QN', 'WILL', 'PERCEPTION'] as const) {
      const attribute = this.input.traits.attributes.find(attr => attr.name.toLowerCase() === key.toLowerCase())
      if (attribute) {
        this.output.attributes[key === 'PERCEPTION' ? 'PER' : key] = {
          import: attribute.score,
          points: attribute.points,
        }
      } else {
        this.output.attributes[key === 'PERCEPTION' ? 'PER' : key] = {
          import: 10,
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
      createdon: this.input.author?.datecreated ?? '',
      modifiedon: '',
      player: this.input.player ?? '',
    }
  }

  /* ---------------------------------------- */

  #importHitLocations() {
    this.output.additionalresources ||= {}
    this.output.additionalresources.bodyplan = this.input.bodytype ?? 'Humanoid'

    const table = HitLocations.hitlocationDictionary?.[this.input.bodytype ?? 'Humanoid']
    this.output.hitlocationsV2 = []
    this.input.body?.forEach(location => {
      if (location.display === 0) return // Skip hidden locations

      let roll = ''

      if (table) {
        const [_, standardEntry] = HitLocations.HitLocation.findTableEntry(table, location.name)
        if (standardEntry) {
          roll = standardEntry.roll
        }
      }

      const newLocation: DataModel.CreateData<HitLocationSchemaV2> = {
        where: location.name ?? '',
        import: parseInt(location.dr) ?? 0,
        rollText: roll,
        split: {},
      }

      ;(this.output.hitlocationsV2 as DataModel.CreateData<HitLocationSchemaV2>[]).push(newLocation)
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

  #importItem(
    item: GCATrait,
    containedBy: string | null = null
  ): DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> {
    const system: DataModel.CreateData<DataModel.SchemaOf<BaseItemModel>> = { actions: {}, containedBy }

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
      ) as any

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

    const damage = `${weapon.chardamage} ${weapon.chardamtype}`

    const component: DataModel.CreateData<MeleeAttackComponentSchema> = {
      name: item.name,
      notes: weapon.notes ?? '',
      pageref: '',
      mode: weapon.name ?? '',
      import: weapon.charskillscore ?? 0,
      damage,
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
      mel: component,
    }
  }

  #importRangedWeapon(weapon: GCAAttackMode, item: GCATrait): DataModel.CreateData<RangedAttackSchema> {
    const name = weapon.name ?? ''
    const type = 'rangedAttack'
    const _id = foundry.utils.randomID()

    const damage = `${weapon.chardamage} ${weapon.chardamtype}`

    const component: DataModel.CreateData<RangedAttackComponentSchema> = {
      name: item.name ?? '',
      notes: weapon.notes ?? '',
      pageref: '',
      mode: weapon.name ?? '',
      import: weapon.charskillscore ?? 0,
      damage,
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
      rng: component,
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
  #importTrait(trait: GCATrait, containedBy: string | null = null): Item.CreateData {
    const type = 'featureV2'
    const _id = foundry.utils.randomID()

    let name = trait.name ?? 'Trait'
    const crRegex = /\[\s*CR: (\d{1,2})\s*\]/i

    const system: DataModel.CreateData<TraitSchema> = this.#importItem(trait, containedBy)
    const component: DataModel.CreateData<TraitComponentSchema> = this.#importTraitComponent(trait)

    if (crRegex.test(name)) {
      component.cr = parseInt(name.match(crRegex)?.[1] ?? '0')
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
      ?.map((child: GCATrait) => this.#importTrait(child, _id)) ?? []

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

  #importSkill(skill: GCATrait, containedBy: string | null = null): Item.CreateData {
    const type = 'skillV2'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = skill.name ?? 'Skill'

    const system: DataModel.CreateData<SkillSchema> = this.#importItem(skill, containedBy)
    const component: DataModel.CreateData<SkillComponentSchema> = this.#importSkillComponent(skill)

    skill.getChildren(this.input.traits.skills)?.map((child: GCATrait) => this.#importSkill(child, _id)) ?? []

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

  #importSpell(spell: GCATrait, containedBy: string | null = null): Item.CreateData {
    const type = 'spellV2'
    const _id = foundry.utils.randomID()
    // TODO: localize
    const name = spell.name ?? 'Spell'

    const system: DataModel.CreateData<SpellSchema> = this.#importItem(spell, containedBy)
    const component: DataModel.CreateData<SpellComponentSchema> = this.#importSpellComponent(spell)

    spell.getChildren(this.input.traits.spells)?.map((child: GCATrait) => this.#importSpell(child, _id)) ?? []

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

  #importEquipment(equipment: GCATrait, containedBy: string | null = null): Item.CreateData {
    const type = 'equipmentV2'
    const _id = foundry.utils.randomID()
    const name = equipment.name ?? 'Equipment'

    const system: DataModel.CreateData<EquipmentSchema> = this.#importItem(equipment, containedBy)
    const component: DataModel.CreateData<EquipmentComponentSchema> = this.#importEquipmentComponent(equipment)

    equipment.getChildren(this.input.traits.equipment)?.map((child: GCATrait) => this.#importEquipment(child, _id)) ??
      []

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
      importFrom: 'GCA',
    }
    return component
  }

  /* ---------------------------------------- */

  #importTraitComponent(trait: GCATrait): DataModel.CreateData<TraitComponentSchema> {
    // If the cost includes a separator "/", the Trait is treated as leveled by GCA.
    const isLeveled = trait.calcs.cost?.includes('/') ?? false

    return {
      ...this.#importBaseComponent(trait),
      cr: 0,
      level: isLeveled ? (trait.level ?? 0) : null,
      userdesc: trait.ref?.description ?? '',
      points: trait.points ?? 0,
    }
  }

  /* ---------------------------------------- */

  #importSkillComponent(skill: GCATrait): DataModel.CreateData<SkillComponentSchema> {
    return {
      ...this.#importBaseComponent(skill),
      points: skill.points ?? 0,
      type: skill.type ?? '',
      relativelevel: `${skill.stepoff}${skill.step}`,
      import: skill.level ?? 0,
    }
  }

  /* ---------------------------------------- */

  #importSpellComponent(spell: GCATrait): DataModel.CreateData<SpellComponentSchema> {
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
        .map(e => e.trim())
        .filter(e => !e.startsWith('~'))
        .join(', ') ?? ''

    return {
      ...this.#importBaseComponent(spell),
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
  }

  /* ---------------------------------------- */

  #importEquipmentComponent(equipment: GCATrait): DataModel.CreateData<EquipmentComponentSchema> {
    return {
      ...this.#importBaseComponent(equipment),
      count: equipment.count ?? 1,
      weight: parseFloat(equipment.calcs.postformulaweight ?? '0') ?? 0,
      cost: parseFloat(equipment.calcs.postformulacost ?? '0') ?? 0,
      location: '',
      carried: true,
      equipped: true,
      techlevel: equipment.tl ?? '',
      categories: equipment.cat,
      costsum: parseFloat(equipment.calcs.postchildrencost || equipment.calcs.postformulacost || '0') ?? 0,
      weightsum: equipment.calcs.postchildrenweight || equipment.calcs.postformulaweight || '',
      uses: 0,
      maxuses: 0,
    }
  }
}

/* ---------------------------------------- */

export { GcaImporter }
