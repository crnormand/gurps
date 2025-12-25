import { GurpsActor } from '../actor.js'
import { GurpsActorSheet } from '../actor-sheet.js'

export function buildEntityPath(basePath: string, key: string): string {
  return `${basePath}.${key}`
}

export function getDisplayName(
  obj: Record<string, unknown> | undefined,
  displayProperty: string,
  fallbackLocaleKey: string
): string {
  if (obj && typeof obj[displayProperty] === 'string') {
    return obj[displayProperty] as string
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
    content: `<p>${game.i18n!.localize('GURPS.delete')}: <strong>${displayName || game.i18n!.localize(fallbackLocaleKey)}</strong>?</p>`
  })
  if (confirmed) {
    GURPS.removeKey(actor, key)
  }
  return confirmed ?? false
}

export function bindCrudActions(
  html: JQuery,
  actor: GurpsActor,
  sheet: GurpsActorSheet,
  config: EntityConfigWithMethod
): void {
  const { entityName, path, EntityClass, editMethod, localeKey, displayProperty = 'name', createArgs } = config

  html.find(`[data-action="add-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    const obj = createArgs ? new EntityClass(...createArgs) : new EntityClass(game.i18n!.localize(localeKey))
    const list = GURPS.decode<Record<string, unknown>>(actor, path) || {}
    const key = GURPS.put(list, foundry.utils.duplicate(obj))
    await actor.internalUpdate({ [path]: list })
    const fullPath = buildEntityPath(path, key)
    const newObj = foundry.utils.duplicate(GURPS.decode(actor, fullPath))
    await editMethod.call(sheet, actor, fullPath, newObj)
  })

  html.find(`[data-action="edit-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const objPath = target.dataset.key ?? ''
    const obj = foundry.utils.duplicate(GURPS.decode(actor, objPath))
    await editMethod.call(sheet, actor, objPath, obj)
  })

  html.find(`[data-action="delete-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const key = target.dataset.key ?? ''
    const obj = GURPS.decode<Record<string, unknown>>(actor, key)
    await confirmAndDelete(actor, key, obj?.[displayProperty] as string | undefined, localeKey)
  })
}

export function bindModifierCrudActions(
  html: JQuery,
  actor: GurpsActor,
  sheet: GurpsActorSheet,
  editMethod: (actor: GurpsActor, path: string, obj: unknown, isReaction: boolean) => Promise<void>,
  isReaction: boolean
): void {
  const entityName = isReaction ? 'reaction' : 'conditional'
  const path = isReaction ? 'system.reactions' : 'system.conditionalmods'
  const localeKey = isReaction ? 'GURPS.reaction' : 'GURPS.conditionalModifier'

  html.find(`[data-action="add-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    const { Reaction, Modifier } = await import('../actor-components.js')
    const EntityClass = isReaction ? Reaction : Modifier
    const obj = new EntityClass('0', game.i18n!.localize(localeKey))
    const list = GURPS.decode<Record<string, unknown>>(actor, path) || {}
    const key = GURPS.put(list, foundry.utils.duplicate(obj))
    await actor.internalUpdate({ [path]: list })
    const fullPath = buildEntityPath(path, key)
    const newObj = foundry.utils.duplicate(GURPS.decode(actor, fullPath))
    await editMethod.call(sheet, actor, fullPath, newObj, isReaction)
  })

  html.find(`[data-action="edit-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const objPath = target.dataset.key ?? ''
    const obj = foundry.utils.duplicate(GURPS.decode(actor, objPath))
    await editMethod.call(sheet, actor, objPath, obj, isReaction)
  })

  html.find(`[data-action="delete-${entityName}"]`).on('click', async (event: JQuery.ClickEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const target = event.currentTarget as HTMLElement
    const key = target.dataset.key ?? ''
    const obj = GURPS.decode<Record<string, unknown>>(actor, key)
    await confirmAndDelete(actor, key, obj?.situation as string | undefined, localeKey)
  })
}
