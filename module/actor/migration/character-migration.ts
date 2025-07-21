import DataModel = foundry.abstract.DataModel
import { CharacterSchema } from '../data/character.js'
import { SemanticVersion } from '../../../lib/semver.js'

/* ---------------------------------------- */

// Migrate attribute pool points from string to number
function migrateAttributePool(source: any): DataModel.CreateData<CharacterSchema>['HP' | 'FP'] {
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

function migrateAdvantages(source: any): DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'feature'>>>[] {
  const items: DataModel.CreateData<DataModel.SchemaOf<Item.OfType<'feature'>>>[] = []

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

function migrateCharacter(source: any): {
  system: DataModel.CreateData<CharacterSchema>
  items: Item.CreateData[]
} {
  const actorVersion = SemanticVersion.fromString(source._stats.systemVersion)
  if (!actorVersion) {
    throw new Error('Invalid actor version format')
  }
  const migrationVersion = SemanticVersion.fromString(game.system?.version ?? '0.0.0')
  if (!migrationVersion) {
    throw new Error('Invalid migration version format')
  }

  if (!migrationVersion.isHigherThan(actorVersion)) {
    console.log('GURPS | No migration needed, actor version is up to date.')
    return source
  }

  const exported: { system: DataModel.CreateData<CharacterSchema>; items: Item.CreateData[] } = {
    system: {},
    items: [],
  }

  console.log('Before', source)

  exported.system.HP = migrateAttributePool(source.system.HP)
  exported.system.FP = migrateAttributePool(source.system.FP)
  exported.system.QP = migrateAttributePool(source.system.QP)

  exported.system.additionalresources = migrateAdditionalResources(source.system.additionalresources)

  exported.items.push(...migrateAdvantages(source.system.ads))
  exported.items.push(...migrateSkills(source.system.skills))
  exported.items.push(...migrateSpells(source.system.spells))
  exported.items.push(...migrateEquipment(source.system.equipment.carried))
  exported.items.push(...migrateEquipment(source.system.equipment.other))

  console.log('After', exported)
  return exported
}

/* ---------------------------------------- */

export { migrateCharacter }
