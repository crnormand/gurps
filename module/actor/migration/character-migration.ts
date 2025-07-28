import DataModel = foundry.abstract.DataModel
import { CharacterSchema } from '../data/character.js'
import { MeleeAttackSchema } from '../../action/melee-attack.js'
import { RangedAttackSchema } from '../../action/ranged-attack.js'
import { PseudoDocumentSchema } from '../../pseudo-document/pseudo-document.js'
import { HitLocationSchema } from '../data/hit-location-entry.js'

/* ---------------------------------------- */

// Migrate attribute pool points from string to number
function migrateAttributePool(source: any): DataModel.CreateData<CharacterSchema>['HP' | 'FP' | 'QP'] {
  const points = (() => {
    switch (typeof source.points) {
      case 'number':
        return source.points
      case 'string':
        return parseInt(source.points)
      default:
        return 0
    }
  })()
  return {
    ...source,
    points,
  }
}

/* ---------------------------------------- */

function migrateAdditionalResources(source: any): DataModel.CreateData<CharacterSchema>['additionalresources'] {
  const tracker = Object.values(source.tracker)

  return {
    ...source,
    tracker,
  }
}

/* ---------------------------------------- */

function migrateAttributes(source: any): DataModel.CreateData<CharacterSchema>['attributes'] {
  const attributes: DataModel.CreateData<CharacterSchema>['attributes'] = {}

  for (const [key, value] of Object.entries(source) as [keyof CharacterSchema['attributes']['fields'], any][]) {
    attributes[key as keyof CharacterSchema['attributes']['fields']] = {
      import: Number(value.import) || 0,
      value: Number(value.value) || 0,
      points: Number(value.points) || 0,
    }
  }

  return attributes
}

/* ---------------------------------------- */

function migrateAdvantages(source: any): DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'feature'>>>[] {
  const items: DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'feature'>>>[] = []

  if (!source) return items

  for (const item of Object.values(source) as any[]) {
    const contains: string[] = []
    let containedItems: DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'feature'>>>[] = []
    if (Object.keys(item.contains ?? {}).length > 0) {
      containedItems = migrateAdvantages(item.contains)
    }
    for (const containedItem of containedItems) {
      if (containedItem.system.fea.parentuuid === item.uuid) contains.push(`${containedItem._id}`)
    }

    items.push(
      {
        name: item.name,
        _id: foundry.utils.randomID(),
        type: 'feature',
        system: {
          fea: {
            ...item,
            contains,
            level: item.level || 0,
          },
        },
      },
      ...containedItems
    )
  }

  return items
}

/* ---------------------------------------- */

function migrateSkills(source: any): DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'skill'>>>[] {
  const items: DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'skill'>>>[] = []

  if (!source) return items

  for (const item of Object.values(source) as any[]) {
    const contains: string[] = []
    let containedItems: DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'skill'>>>[] = []
    if (Object.keys(item.contains ?? {}).length > 0) {
      containedItems = migrateSkills(item.contains)
    }
    for (const containedItem of containedItems) {
      if (containedItem.system.ski.parentuuid === item.uuid) contains.push(`${containedItem._id}`)
    }

    items.push(
      {
        name: item.name,
        _id: foundry.utils.randomID(),
        type: 'skill',
        system: {
          ski: {
            ...item,
            contains,
          },
        },
      },
      ...containedItems
    )
  }

  return items
}

/* ---------------------------------------- */

function migrateSpells(source: any): DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'spell'>>>[] {
  const items: DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'spell'>>>[] = []

  if (!source) return items

  for (const item of Object.values(source) as any[]) {
    const contains: string[] = []
    let containedItems: DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'spell'>>>[] = []
    if (Object.keys(item.contains ?? {}).length > 0) {
      containedItems = migrateSpells(item.contains)
    }
    for (const containedItem of containedItems) {
      if (containedItem.system.spl.parentuuid === item.uuid) contains.push(`${containedItem._id}`)
    }

    items.push(
      {
        name: item.name,
        _id: foundry.utils.randomID(),
        type: 'spell',
        system: {
          spl: {
            ...item,
            contains,
          },
        },
      },
      ...containedItems
    )
  }

  return items
}

/* ---------------------------------------- */

function migrateEquipment(source: any): DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'equipment'>>>[] {
  const items: DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'equipment'>>>[] = []

  if (!source) return items

  for (const item of Object.values(source) as any[]) {
    const contains: string[] = []
    let containedItems: DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'equipment'>>>[] = []
    if (Object.keys(item.contains ?? {}).length > 0) {
      containedItems = migrateEquipment(item.contains)
    }
    for (const containedItem of containedItems) {
      if (containedItem.system.eqt.parentuuid === item.uuid) contains.push(`${containedItem._id}`)
    }

    items.push(
      {
        name: item.name,
        _id: foundry.utils.randomID(),
        type: 'equipment',
        system: {
          eqt: {
            ...item,
            contains,
          },
        },
      },
      ...containedItems
    )
  }

  return items
}

/* ---------------------------------------- */

function migrateMeleeAttacks(source: any, items: Item.CreateData[]): void {
  if (!source) return

  for (const attack of Object.values(source) as any[]) {
    const parentIndex = items.findIndex(item => item.name === attack.name)
    if (parentIndex === -1) {
      console.error(`GURPS | Could not find parent item for melee attack: ${attack.name} (${attack.mode})`)
      continue
    }

    const id = foundry.utils.randomID()
    items[parentIndex].system!.actions ??= {}
    const actionData: DataModel.CreateData<MeleeAttackSchema> = {
      name: '',
      img: '',
      sort: 0,
      type: 'meleeAttack',
      mel: { ...attack, weight: parseFloat(attack.weight) || 0 },
    }

    ;(items[parentIndex].system!.actions as Record<string, DataModel.CreateData<PseudoDocumentSchema>>)[id] = actionData
  }
}

/* ---------------------------------------- */

function migrateRangedAttacks(source: any, items: Item.CreateData[]): void {
  if (!source) return

  for (const attack of Object.values(source) as any[]) {
    const parentIndex = items.findIndex(item => item.name === attack.name)
    if (parentIndex === -1) {
      console.error(`GURPS | Could not find parent item for ranged attack: ${attack.name} (${attack.mode})`)
      continue
    }

    const id = foundry.utils.randomID()
    items[parentIndex].system!.actions ??= {}
    const actionData: DataModel.CreateData<RangedAttackSchema> = {
      name: '',
      img: '',
      sort: 0,
      type: 'rangedAttack',
      rng: attack,
    }

    ;(items[parentIndex].system!.actions as Record<string, DataModel.CreateData<PseudoDocumentSchema>>)[id] = actionData
  }
}

/* ---------------------------------------- */

function migrateReactions(source: any): DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'feature'>>> {
  const convertReaction = (e: any): any => {
    return {
      modifier: Number(e.modifier),
      situation: e.situation,
      modifierTags: e.modifierTags,
    }
  }

  const reactions = Object.values(source.reactions ?? {}).map(e => convertReaction(e))
  const conditionalmods = Object.values(source.conditionalmods ?? {}).map(e => convertReaction(e))
  return {
    _id: foundry.utils.randomID(),
    name: 'Reaction Holder',
    img: '',
    sort: 0,
    type: 'feature',
    system: {
      reactions,
      conditionalmods,
      fea: {
        name: 'Reaction Holder',
        notes: 'This item holds all reactions and conditional modifiers. Just a migration quirk.',
        import: 0,
        level: 0,
        points: 0,
      },
    },
  }
}

/* ---------------------------------------- */

function migrateHitLocations(source: any): DataModel.CreateData<HitLocationSchema>[] {
  const loc = Object.values(source).map((e: any) => {
    return {
      where: String(e.where),
      import: Number(e.import),
      penalty: Number(e.penalty),
      rollText: e.roll,
      split: e.split,
    }
  })

  return loc
}

/* ---------------------------------------- */

function migrateCharacter(source: any): DataModel.CreateData<DataModel.SchemaOf<Actor.OfType<'character'>>> {
  if (!source || !source._stats || !source._stats.systemVersion) {
    // No source provided, skip migration
    return source
  }

  const actorVersion = source._stats.systemVersion
  const migrationVersion = game.system?.version ?? '0.0.0'

  if (!foundry.utils.isNewerVersion(migrationVersion, actorVersion)) {
    return source
  }

  console.log(`GURPS | Migrating Actor data for ${source.name} (${source._id})`)

  source.items = []
  const system: DataModel.CreateData<CharacterSchema> = {}
  source._stats.systemVersion = game.system?.version

  system.HP = migrateAttributePool(source.system.HP)
  system.FP = migrateAttributePool(source.system.FP)
  system.QP = migrateAttributePool(source.system.QP)

  system.additionalresources = migrateAdditionalResources(source.system.additionalresources)
  system.attributes = migrateAttributes(source.system.attributes)
  system.basicmove = source.system.basicmove
  system.basicspeed = source.system.basicspeed
  system.conditionalinjury = source.system.conditionalinjury
  system.conditions = source.system.conditions
  system.dodge = source.system.dodge

  system.frightcheck = source.system.frightcheck
  system.hearing = source.system.hearing
  system.tastesmell = source.system.tastesmell
  system.vision = source.system.vision
  system.touch = source.system.touch
  system.parry = source.system.parry

  system.thrust = source.system.thrust
  system.swing = source.system.swing

  system.totalpoints = source.system.totalpoints

  system.traits = {
    ...source.system.traits,
    sizemod: Number(source.system.traits.sizemod),
  }

  system.hitlocations = migrateHitLocations(source.system.hitlocations)

  const items: Item.CreateData[] = []
  if (source.system?.ads) items.push(...migrateAdvantages(source.system.ads))
  if (source.system?.skils) items.push(...migrateSkills(source.system.skills))
  if (source.system?.spells) items.push(...migrateSpells(source.system.spells))
  if (source.system.equipment) {
    items.push(...migrateEquipment(source.system.equipment?.carried))
    items.push(...migrateEquipment(source.system.equipment?.other))
  }
  if (source.system) items.push(migrateReactions(source.system))

  migrateMeleeAttacks(source.system.melee, items)
  migrateRangedAttacks(source.system.ranged, items)

  source.system = system
  source.items = items

  return source
}

/* ---------------------------------------- */

export { migrateCharacter }
