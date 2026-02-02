import { GurpsActor } from '../actor.js'
import { GurpsItem } from '../../item.js'

export type EntityWithItemId = EntityComponentBase & { itemid?: string }
type GurpsItemWithEditingActor = GurpsItem & { editingActor?: GurpsActor; system?: { fromItem?: string } }
type ActorWithSanityCheck = GurpsActor & { _sanityCheckItemSettings(obj: unknown): Promise<boolean> }

export async function openItemSheetIfFoundryItem(actor: GurpsActor, entityData: EntityWithItemId): Promise<boolean> {
  if (!entityData?.itemid) return false

  if (!(await (actor as ActorWithSanityCheck)._sanityCheckItemSettings(entityData))) return true

  let item = actor.items.get(entityData.itemid) as GurpsItemWithEditingActor | undefined
  if (!item) return false

  if (item.system?.fromItem) {
    item = actor.items.get(item.system.fromItem) as GurpsItemWithEditingActor | undefined
  }
  if (!item) return false

  item.editingActor = actor
  item.sheet?.render(true)
  return true
}

export function buildEntityPath(basePath: string, key: string): string {
  return `${basePath}.${key}`
}

export function getDisplayName(
  obj: EntityComponentBase | undefined,
  displayProperty: keyof EntityComponentBase,
  fallbackLocaleKey: string
): string {
  if (obj && typeof obj[displayProperty] === 'string') {
    return obj[displayProperty]
  }
  return game.i18n!.localize(fallbackLocaleKey)
}

export async function confirmAndDelete(
  actor: GurpsActor,
  key: string,
  displayName: string | undefined,
  fallbackLocaleKey: string
): Promise<boolean> {
  const confirmed = await Dialog.confirm({
    title: game.i18n!.localize('GURPS.delete'),
    content: `<p>${game.i18n!.localize('GURPS.delete')}: <strong>${displayName || game.i18n!.localize(fallbackLocaleKey)}</strong>?</p>`,
  })
  if (confirmed) {
    await actor.deleteEntry(key)
  }
  return confirmed ?? false
}

export function bindCrudActions<TSheet extends GurpsActorSheetEditMethods>(
  html: JQuery,
  actor: GurpsActor,
  sheet: TSheet,
  config: EntityConfigWithMethod
): void {
  const { entityName, path, EntityClass, editMethod, localeKey, displayProperty = 'name', createArgs } = config

  html.find(`[data-action="add-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    const newEntity = createArgs ? new EntityClass(...createArgs) : new EntityClass(game.i18n!.localize(localeKey))
    const list = GURPS.decode<Record<string, EntityComponentBase>>(actor, path) || {}
    const key = GURPS.put(list, foundry.utils.duplicate(newEntity))
    await actor.internalUpdate({ [path]: list })

    const fullPath = buildEntityPath(path, key)
    const duplicatedEntity = foundry.utils.duplicate(GURPS.decode<EntityComponentBase>(actor, fullPath))
    await editMethod.call(sheet, actor, fullPath, duplicatedEntity)
  })

  html.find(`[data-action="edit-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const entityPath = target.dataset.key ?? ''
    const entityData = foundry.utils.duplicate(GURPS.decode<EntityComponentBase>(actor, entityPath))

    if (await openItemSheetIfFoundryItem(actor, entityData as EntityWithItemId)) return

    await editMethod.call(sheet, actor, entityPath, entityData)
  })

  html.find(`[data-action="delete-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const entityKey = target.dataset.key ?? ''
    const entityData = GURPS.decode<EntityComponentBase>(actor, entityKey)
    const displayValue = displayProperty === 'name' ? entityData?.name : entityData?.notes
    await confirmAndDelete(actor, entityKey, displayValue, localeKey)
  })
}

export function bindModifierCrudActions<TSheet extends GurpsActorSheetEditMethods>(
  html: JQuery,
  actor: GurpsActor,
  sheet: TSheet,
  editMethod: TSheet['editModifier'],
  isReaction: boolean
): void {
  const entityName = isReaction ? 'reaction' : 'conditional'
  const path = isReaction ? 'system.reactions' : 'system.conditionalmods'
  const localeKey = isReaction ? 'GURPS.reaction' : 'GURPS.conditionalModifier'

  html.find(`[data-action="add-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    const { Reaction, Modifier } = await import('../actor-components.js')
    const ModifierClass = isReaction ? Reaction : Modifier
    const newModifier = new ModifierClass('0', game.i18n!.localize(localeKey))
    const list = GURPS.decode<Record<string, ModifierComponent>>(actor, path) || {}
    const key = GURPS.put(list, foundry.utils.duplicate(newModifier))
    await actor.internalUpdate({ [path]: list })

    const fullPath = buildEntityPath(path, key)
    const duplicatedModifier = foundry.utils.duplicate(GURPS.decode<ModifierComponent>(actor, fullPath))
    await editMethod.call(sheet, actor, fullPath, duplicatedModifier, isReaction)
  })

  html.find(`[data-action="edit-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const modifierPath = target.dataset.key ?? ''
    const modifierData = foundry.utils.duplicate(GURPS.decode<ModifierComponent>(actor, modifierPath))
    await editMethod.call(sheet, actor, modifierPath, modifierData, isReaction)
  })

  html.find(`[data-action="delete-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const modifierKey = target.dataset.key ?? ''
    const modifierData = GURPS.decode<ModifierComponent>(actor, modifierKey)
    await confirmAndDelete(actor, modifierKey, modifierData?.situation, localeKey)
  })
}
