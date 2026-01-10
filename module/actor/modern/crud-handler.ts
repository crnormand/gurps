import { getGame, isHTMLElement } from '../../types/guards.ts'

export type EntityWithItemId = EntityComponentBase & { itemid?: string }
type GurpsItemWithEditingActor = Item.Implementation & {
  editingActor?: Actor.Implementation
  system?: { fromItem?: string }
}
type ActorWithSanityCheck = Actor.Implementation & { _sanityCheckItemSettings(obj: unknown): Promise<boolean> }

export async function openItemSheetIfFoundryItem(
  actor: Actor.Implementation,
  entityData: EntityWithItemId
): Promise<boolean> {
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

  return getGame().i18n.localize(fallbackLocaleKey)
}

export async function confirmAndDelete(
  actor: Actor.Implementation,
  key: string,
  displayName: string | undefined,
  fallbackLocaleKey: string
): Promise<boolean> {
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: getGame().i18n.localize('GURPS.delete') },
    content: `<p>${getGame().i18n.localize('GURPS.delete')}: <strong>${displayName || getGame().i18n.localize(fallbackLocaleKey)}</strong>?</p>`,
  })

  if (confirmed) {
    GURPS.removeKey(actor, key)
  }

  return confirmed ?? false
}

export function bindCrudActions<TSheet extends GurpsActorSheetEditMethods>(
  html: HTMLElement,
  actor: Actor.Implementation,
  sheet: TSheet,
  config: EntityConfigWithMethod
): void {
  const { entityName, path, EntityClass, editMethod, localeKey, displayProperty = 'name', createArgs } = config

  const addButtons = html.querySelectorAll<HTMLElement>(`[data-action="add-${entityName}"]`)

  addButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      const newEntity = createArgs
        ? new EntityClass(...createArgs)
        : new EntityClass(getGame().i18n.localize(localeKey))
      const list = GURPS.decode<Record<string, EntityComponentBase>>(actor, path) || {}
      const key = GURPS.put(list, foundry.utils.duplicate(newEntity))

      await actor.internalUpdate({ [path]: list })

      const fullPath = buildEntityPath(path, key)
      const duplicatedEntity = foundry.utils.duplicate(GURPS.decode<EntityComponentBase>(actor, fullPath))

      await editMethod.call(sheet, actor, fullPath, duplicatedEntity)
    })
  })

  const editButtons = html.querySelectorAll<HTMLElement>(`[data-action="edit-${entityName}"]`)

  editButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const entityPath = target.dataset.key ?? ''
      const entityData = foundry.utils.duplicate(GURPS.decode<EntityComponentBase>(actor, entityPath))

      if (await openItemSheetIfFoundryItem(actor, entityData as EntityWithItemId)) return

      await editMethod.call(sheet, actor, entityPath, entityData)
    })
  })

  const deleteButtons = html.querySelectorAll<HTMLElement>(`[data-action="delete-${entityName}"]`)

  deleteButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const entityKey = target.dataset.key ?? ''
      const entityData = GURPS.decode<EntityComponentBase>(actor, entityKey)
      const displayValue = displayProperty === 'name' ? entityData?.name : entityData?.notes

      await confirmAndDelete(actor, entityKey, displayValue, localeKey)
    })
  })
}

export function bindModifierCrudActions<TSheet extends GurpsActorSheetEditMethods>(
  html: HTMLElement,
  actor: Actor.Implementation,
  sheet: TSheet,
  editMethod: TSheet['editModifier'],
  isReaction: boolean
): void {
  const entityName = isReaction ? 'reaction' : 'conditional'
  const path = isReaction ? 'system.reactions' : 'system.conditionalmods'
  const localeKey = isReaction ? 'GURPS.reaction' : 'GURPS.conditionalModifier'

  const addButtons = html.querySelectorAll<HTMLElement>(`[data-action="add-${entityName}"]`)

  addButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      const { Reaction, Modifier } = await import('../actor-components.js')
      const ModifierClass = isReaction ? Reaction : Modifier
      const newModifier = new ModifierClass('0', getGame().i18n.localize(localeKey))
      const list = GURPS.decode<Record<string, ModifierComponent>>(actor, path) || {}
      const key = GURPS.put(list, foundry.utils.duplicate(newModifier))

      await actor.internalUpdate({ [path]: list })

      const fullPath = buildEntityPath(path, key)
      const duplicatedModifier = foundry.utils.duplicate(GURPS.decode<ModifierComponent>(actor, fullPath))

      await editMethod.call(sheet, actor, fullPath, duplicatedModifier, isReaction)
    })
  })

  const editButtons = html.querySelectorAll<HTMLElement>(`[data-action="edit-${entityName}"]`)

  editButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const modifierPath = target.dataset.key ?? ''
      const modifierData = foundry.utils.duplicate(GURPS.decode<ModifierComponent>(actor, modifierPath))

      await editMethod.call(sheet, actor, modifierPath, modifierData, isReaction)
    })
  })

  const deleteButtons = html.querySelectorAll<HTMLElement>(`[data-action="delete-${entityName}"]`)

  deleteButtons.forEach(button => {
    button.addEventListener('click', async (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      const target = event.currentTarget

      if (!isHTMLElement(target)) return
      const modifierKey = target.dataset.key ?? ''
      const modifierData = GURPS.decode<ModifierComponent>(actor, modifierKey)

      await confirmAndDelete(actor, modifierKey, modifierData?.situation, localeKey)
    })
  })
}
