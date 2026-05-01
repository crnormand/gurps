import { ItemType } from '@module/item/types.js'
import { isHTMLElement } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'

import { ActorType } from '../types.js'

import { GurpsActorGcsSheet } from './gcs-actor-sheet.js'
import { GurpsActorModernSheet } from './modern/sheet.ts'

/**
 * Recursively builds create-data for an item and all its descendants, assigning each a
 * fresh ID and the given container/carried state. Returns a flat array of all items
 * (root first, then all children in depth-first order).
 */
export function buildItemCopyWithChildren(
  item: Item.Implementation,
  containedBy: string,
  carried: boolean
): Item.CreateData[] {
  const newItemData = foundry.utils.mergeObject(item.toObject(), {
    _id: foundry.utils.randomID(),
    system: { containedBy, _carried: carried },
  })
  const childCopies = item.system.children.flatMap(child => buildItemCopyWithChildren(child, newItemData._id, carried))

  return [newItemData, ...childCopies] as Item.CreateData[]
}

/* ---------------------------------------- */

export async function resolveItemDropPosition(target: Item.Implementation): Promise<'before' | 'inside' | null> {
  return await foundry.applications.api.DialogV2.wait({
    window: { title: target.name },
    content: `<p>${game.i18n!.localize('GURPS.dropResolve')}</p>`,
    buttons: [
      {
        action: 'before',
        icon: 'fa-solid fa-turn-left-down',
        label: 'GURPS.dropBefore',
        default: true,
      },
      {
        action: 'inside',
        icon: 'fa-solid fa-sign-in-alt',
        label: 'GURPS.dropInside',
      },
    ],
  })
}

/* ---------------------------------------- */

export async function resolveItemDropQuantity(item: Item.OfType<ItemType.Equipment>): Promise<number | null> {
  const max = item.system.count

  const rangePicker = foundry.applications.elements.HTMLRangePickerElement.create({
    name: 'quantity',
    min: 1,
    max,
    step: 1,
    value: 1,
  })

  const result = await foundry.applications.api.DialogV2.wait({
    window: { title: item.name },
    content: `
<p>${game.i18n!.localize('GURPS.splitQuantity')}</p>
<div class="form-group">
  <label>${game.i18n!.localize('GURPS.quantity')}</label>
  <div class="form-fields">
    ${rangePicker.outerHTML}
  </div>
</div>`,
    buttons: [
      {
        action: 'confirm',
        icon: 'fa-solid fa-check',
        label: 'GURPS.ok',
        default: true,
        callback: (_event, button, _dialog): number => {
          const picker = button.form?.querySelector<HTMLInputElement>('[name="quantity"]')

          // Return NaN for missing or non-numeric input; the caller treats NaN as cancellation.
          return parseInt(picker?.value ?? '')
        },
      },
      {
        action: 'transferAll',
        icon: 'fa-solid fa-angles-right',
        label: 'GURPS.transferAll',
        callback: (): number => max,
      },
    ],
  })

  // null = dialog closed; NaN = user confirmed with an empty/invalid input — both cancel.
  return result === null || !Number.isFinite(result) ? null : result
}

/* ---------------------------------------- */

type Sheet = GurpsActorGcsSheet | GurpsActorModernSheet

/** Resolves the nearest [data-item-id] ancestor in the DOM to an actor item. */
function resolveDropTargetItem(
  sheet: Sheet,
  element: HTMLElement
): { dropTarget: HTMLElement | null; target: Item.Implementation | null } {
  const dropTarget = element.closest<HTMLElement>('[data-item-id]')
  const target = dropTarget ? (sheet.actor.items.get(dropTarget.dataset.itemId!) ?? null) : null

  return { dropTarget, target }
}

/* ---------------------------------------- */

/**
 * Determines whether the item will be placed in the carried or other-equipment section.
 * Inherits the carried flag from the target item when one exists; otherwise reads data-table-id
 * from the DOM.
 */
function resolveCarriedState(target: Item.Implementation | null, element: HTMLElement): boolean {
  if (target?.isOfType(ItemType.Equipment)) return target.system.carried
  const tableId = element.closest<HTMLElement>('[data-table-id]')?.dataset.tableId

  return tableId === 'carriedEquipment'
}

/* ---------------------------------------- */

/**
 * Derives containedBy, targetContainer, siblings, and the effective sort anchor (effectiveTarget)
 * from the user's chosen drop position. For an 'inside' drop the first child of the container
 * becomes the sort anchor; for a 'before' drop the sort peers are the target's existing siblings.
 */
function resolveContainmentContext(
  sheet: Sheet,
  item: Item.Implementation,
  target: Item.Implementation | null,
  dropTarget: HTMLElement | null,
  dropPosition: 'before' | 'inside' | null,
  carried: boolean
): {
  containedBy: string | null
  targetContainer: Item.Implementation | null
  siblings: Item.Implementation[]
  effectiveTarget: Item.Implementation | null
} {
  let siblings = sheet.actor.system.getCollectionForItemType(item.type, carried)
  let containedBy: string | null = null
  let targetContainer: Item.Implementation | null = null
  let effectiveTarget = target

  if (dropPosition === 'inside') {
    containedBy = dropTarget!.dataset.itemId!
    targetContainer = target
    siblings = target?.system.children ?? []
    effectiveTarget = siblings[0] ?? null
  } else if (dropPosition === 'before') {
    containedBy = target?.system.containedBy ?? null
    targetContainer = target?.system.container ?? null
    if (targetContainer) siblings = targetContainer.system.children
  }

  return { containedBy, targetContainer, siblings, effectiveTarget }
}

/**
 * Runs performIntegerSort and extracts the dropped item's new sort value plus any sibling
 * reindex updates. Re-resolves effectiveTarget by reference within siblings to guard against
 * staleness between data-preparation cycles.
 */
function computeItemSort(
  item: Item.Implementation,
  effectiveTarget: Item.Implementation | null,
  siblings: Item.Implementation[]
): { sort: number | undefined; siblingSortData: Item.UpdateData[] } {
  const sortTarget = effectiveTarget
    ? (siblings.find(sibling => sibling === effectiveTarget) ??
      siblings.find(sibling => sibling.id === effectiveTarget.id) ??
      null)
    : null

  const sortUpdates = foundry.utils.performIntegerSort(item, { target: sortTarget, siblings, sortBefore: true })

  const sort = sortUpdates.find(update => update.target === item)?.update.sort
  const siblingSortData = sortUpdates
    .filter(update => update.target !== item)
    .map(update => ({ _id: update.target._id, sort: update.update.sort }) as Item.UpdateData)

  return { sort, siblingSortData }
}

/* ---------------------------------------- */

/**
 * Builds creation, deletion, and update records for a cross-actor equipment transfer. Creates
 * the item and all its descendants with fresh IDs on the target actor, adds a notification, and
 * — when the caller owns the source — deletes or decrements the source stack.
 */
function resolveEquipmentCrossActorDetails(
  sheet: Sheet,
  item: Item.OfType<ItemType.Equipment>,
  containedBy: string | null,
  carried: boolean,
  sort: number | undefined,
  details: GurpsActorGcsSheet.ItemDropDetails,
  transferredQuantity: number
): void {
  const remainingQuantity = item.system.count - transferredQuantity

  const newItemData = foundry.utils.mergeObject(item.toObject(), {
    _id: foundry.utils.randomID(),
    system: { count: transferredQuantity, containedBy, _carried: carried },
    sort,
  })
  const newChildData = item.system.children.flatMap(child =>
    buildItemCopyWithChildren(child as Item.OfType<ItemType.Equipment>, newItemData._id, carried)
  ) as Item.CreateData[]

  details.creations.push({ data: [newItemData, ...newChildData], operation: { parent: sheet.actor, keepId: true } })
  details.notification = game.i18n!.format('GURPS.dragDrop.equipmentTransferred', {
    count: String(transferredQuantity),
    itemName: item.name,
    sourceName: item.actor?.name ?? '?',
    targetName: sheet.actor.name,
  })

  if (item.isOwner) {
    if (remainingQuantity <= 0) {
      // Children are not cascade-deleted when their container is removed, so include them explicitly.
      const allSourceIds = [item.id!, ...item.system.allContents.map(child => child.id!)]

      details.deletions.push({ ids: allSourceIds, operation: { parent: item.parent! } })
    } else {
      details.updates.push({
        data: [{ _id: item._id, 'system.count': remainingQuantity } as Item.UpdateData],
        operation: { parent: item.parent! },
      })
    }
  }
}

/* ---------------------------------------- */

/**
 * Builds update and creation records for a same-actor equipment move or stack split. Returns
 * null if dropping the item into effectiveTarget or targetContainer would create a circular
 * containment relationship.
 */
function resolveEquipmentSameActorDetails(
  sheet: Sheet,
  item: Item.OfType<ItemType.Equipment>,
  effectiveTarget: Item.Implementation | null,
  targetContainer: Item.Implementation | null,
  containedBy: string | null,
  carried: boolean,
  sort: number | undefined,
  details: GurpsActorGcsSheet.ItemDropDetails,
  transferredQuantity: number
): GurpsActorGcsSheet.ItemDropDetails | null {
  if (
    (effectiveTarget && item.system.containsItem(effectiveTarget)) ||
    (targetContainer && item.system.containsItem(targetContainer))
  ) {
    ui.notifications?.warn('GURPS.dragDrop.itemContainerLoop', { localize: true })

    return null
  }

  const remainingQuantity = item.system.count - transferredQuantity

  const childCarriedUpdates = item.system.children.map(child => ({
    _id: child._id,
    'system._carried': carried,
  })) as Item.UpdateData[]

  if (remainingQuantity > 0) {
    // Stack split: move the transferred portion to the new location, duplicate children for both stacks.
    const newItemData = foundry.utils.mergeObject(item.toObject(), {
      _id: foundry.utils.randomID(),
      system: { count: transferredQuantity, containedBy, _carried: carried },
      sort,
    })
    const newChildData = item.system.children.flatMap(child =>
      buildItemCopyWithChildren(child as Item.OfType<ItemType.Equipment>, newItemData._id, carried)
    ) as Item.CreateData[]

    details.creations.push({ data: [newItemData, ...newChildData], operation: { parent: sheet.actor, keepId: true } })
    details.updates.push({
      data: [{ _id: item._id, 'system.count': remainingQuantity } as Item.UpdateData, ...childCarriedUpdates],
      operation: { parent: sheet.actor },
    })
  } else {
    // Full stack move: one batched update covers the item and all its children.
    details.updates.push({
      data: [
        {
          _id: item._id,
          'system.containedBy': containedBy,
          'system.count': transferredQuantity,
          'system._carried': carried,
          sort,
        } as Item.UpdateData,
        ...childCarriedUpdates,
      ],
      operation: { parent: sheet.actor },
    })
  }

  return details
}

/* ---------------------------------------- */

/**
 * Prompts the user for a transfer quantity (skipping the dialog for single-count stacks), then
 * delegates to the cross-actor or same-actor equipment handler. Returns null if the user cancels
 * the quantity dialog.
 */
async function resolveEquipmentDrop(
  sheet: Sheet,
  item: Item.OfType<ItemType.Equipment>,
  effectiveTarget: Item.Implementation | null,
  targetContainer: Item.Implementation | null,
  containedBy: string | null,
  carried: boolean,
  sort: number | undefined,
  details: GurpsActorGcsSheet.ItemDropDetails
): Promise<GurpsActorGcsSheet.ItemDropDetails | null> {
  const transferredQuantity = item.system.count === 1 ? 1 : await resolveItemDropQuantity(item)

  if (transferredQuantity === null) return null

  if (item.actor !== sheet.actor) {
    resolveEquipmentCrossActorDetails(sheet, item, containedBy, carried, sort, details, transferredQuantity)

    return details
  }

  return resolveEquipmentSameActorDetails(
    sheet,
    item,
    effectiveTarget,
    targetContainer,
    containedBy,
    carried,
    sort,
    details,
    transferredQuantity
  )
}

/* ---------------------------------------- */

/**
 * Builds drop details for non-equipment items (traits, skills, spells). Cross-actor drops create
 * a copy of the item and all its descendants; same-actor drops update containedBy and sort. Returns
 * null if a same-actor drop would create a circular containment relationship.
 */
function resolveNonEquipmentDrop(
  sheet: Sheet,
  item: Item.Implementation,
  effectiveTarget: Item.Implementation | null,
  targetContainer: Item.Implementation | null,
  containedBy: string | null,
  carried: boolean,
  sort: number | undefined,
  details: GurpsActorGcsSheet.ItemDropDetails
): GurpsActorGcsSheet.ItemDropDetails | null {
  if (item.actor !== sheet.actor) {
    const newItemData = foundry.utils.mergeObject(item.toObject(), {
      _id: foundry.utils.randomID(),
      system: { containedBy, _carried: carried },
      sort,
    })
    const newChildData = item.system.children.flatMap(child =>
      buildItemCopyWithChildren(child, newItemData._id, carried)
    ) as Item.CreateData[]

    details.creations.push({ data: [newItemData, ...newChildData], operation: { parent: sheet.actor, keepId: true } })
    details.notification = game.i18n!.format('GURPS.dragDrop.itemCopied', {
      itemName: item.name,
      targetName: sheet.actor.name,
      sourceName: item.actor?.name ?? '?',
    })
  } else {
    if (
      (effectiveTarget && item.system.containsItem(effectiveTarget)) ||
      (targetContainer && item.system.containsItem(targetContainer))
    ) {
      ui.notifications?.warn('GURPS.dragDrop.itemContainerLoop', { localize: true })

      return null
    }

    details.updates.push({
      data: [{ _id: item._id, 'system.containedBy': containedBy, sort } as Item.UpdateData],
      operation: { parent: sheet.actor },
    })
  }

  return details
}

export async function resolveItemDropDetails(
  sheet: GurpsActorGcsSheet | GurpsActorModernSheet,
  event: DragEvent,
  item: Item.Implementation
): Promise<GurpsActorGcsSheet.ItemDropDetails | null> {
  if (!isHTMLElement(event.target)) return null

  const element = event.target
  const { dropTarget, target: initialTarget } = resolveDropTargetItem(sheet, element)

  if (initialTarget && initialTarget.type !== item.type) {
    ui.notifications?.warn('GURPS.dragDrop.itemTypeMismatch', { localize: true })

    return null
  }

  const carried = resolveCarriedState(initialTarget, element)
  const dropPosition = initialTarget ? await resolveItemDropPosition(initialTarget) : null

  if (initialTarget && dropPosition === null) return null

  const { containedBy, targetContainer, siblings, effectiveTarget } = resolveContainmentContext(
    sheet,
    item,
    initialTarget,
    dropTarget,
    dropPosition,
    carried
  )

  const { sort, siblingSortData } = computeItemSort(item, effectiveTarget, siblings)

  const details: GurpsActorGcsSheet.ItemDropDetails = { updates: [], creations: [], deletions: [] }

  if (siblingSortData.length > 0) {
    details.updates.push({ data: siblingSortData, operation: { parent: sheet.actor } })
  }

  if (item.isOfType(ItemType.Equipment)) {
    return resolveEquipmentDrop(sheet, item, effectiveTarget, targetContainer, containedBy, carried, sort, details)
  }

  return resolveNonEquipmentDrop(sheet, item, effectiveTarget, targetContainer, containedBy, carried, sort, details)
}

/* ---------------------------------------- */

export async function openQuickNotesEditor(actor: Actor.OfType<ActorType.Character>): Promise<void> {
  const content = await foundry.applications.handlebars.renderTemplate(
    systemPath('templates/actor/quick-notes-editor.hbs'),
    {
      notes: actor.system.additionalresources?.qnotes?.replace(/<br>/g, '\n') ?? '',
    }
  )

  await foundry.applications.api.DialogV2.wait({
    window: { title: 'GURPS.quickNotes.title', resizable: true },
    content,
    buttons: [
      {
        action: 'save',
        label: 'GURPS.quickNotes.save',
        icon: 'fa-solid fa-save',
        callback: async (_event, _button, dialog) => {
          const value = dialog.element.querySelector('textarea')?.value ?? ''

          await actor.update({ 'system.additionalresources.qnotes': value.replace(/\n/g, '<br>') } as Actor.UpdateData)
        },
      },
    ],
  })
}

/* ---------------------------------------- */

type ColorCacheRecord = Record<string, { colorName: string; fallback: string }>

/* ---------------------------------------- */

const ColorCache: Record<string, Record<string, ColorCacheRecord>> = {
  light: {
    FP: {
      Rested: { colorName: 'var(--gga-color-modifier-0)', fallback: '#89bd5b' },
      Tiring: { colorName: 'var(--gga-color-modifier-1)', fallback: '#dddc98' },
      Tired: { colorName: 'var(--gga-color-modifier-4)', fallback: '#c38355' },
      Collapse: { colorName: 'var(--gga-color-modifier-6)', fallback: '#9c423a' },
      Unconscious: { colorName: 'var(--gga-color-modifier-12)', fallback: '#4e211d' },
    },

    HP: {
      Healthy: { colorName: 'var(--gga-color-modifier-0)', fallback: '#89bd5b' },
      Wounded: { colorName: 'var(--gga-color-modifier-1)', fallback: '#dddc98' },
      Reeling: { colorName: 'var(--gga-color-modifier-4)', fallback: '#c38355' },
      Collapse: { colorName: 'var(--gga-color-modifier-6)', fallback: '#9c423a' },
      DeathCheck1: { colorName: 'var(--gga-color-modifier-8)', fallback: '#9c423a' },
      DeathCheck2: { colorName: 'var(--gga-color-modifier-9)', fallback: '#9c423a' },
      DeathCheck3: { colorName: 'var(--gga-color-modifier-10)', fallback: '#9c423a' },
      DeathCheck4: { colorName: 'var(--gga-color-modifier-11)', fallback: '#9c423a' },
      Dead: { colorName: 'var(--gga-color-modifier-12)', fallback: '#9c423a' },
      Destroyed: { colorName: 'var(--gga-color-modifier-12)', fallback: '#9c423a' },
    },

    CI: {
      None: { colorName: 'var(--gga-color-modifier-0)', fallback: '#89bd5b' },
      Scratch: { colorName: 'var(--gga-color-modifier-1)', fallback: '#dddc98' },
      MinorWound1: { colorName: 'var(--gga-color-modifier-2)', fallback: '#dddc98' },
      MinorWound2: { colorName: 'var(--gga-color-modifier-3)', fallback: '#dddc98' },
      MinorWound3: { colorName: 'var(--gga-color-modifier-4)', fallback: '#dddc98' },
      MajorWound: { colorName: 'var(--gga-color-modifier-5)', fallback: '#c38355' },
      Reeling: { colorName: 'var(--gga-color-modifier-6)', fallback: '#9c423a' },
      Crippled1: { colorName: 'var(--gga-color-modifier-7)', fallback: '#9c423a' },
      Crippled2: { colorName: 'var(--gga-color-modifier-8)', fallback: '#9c423a' },
      MortalWound1: { colorName: 'var(--gga-color-modifier-9)', fallback: '#9c423a' },
      MortalWound2: { colorName: 'var(--gga-color-modifier-10)', fallback: '#9c423a' },
      InstantlyFatal1: { colorName: 'var(--gga-color-modifier-11)', fallback: '#9c423a' },
      InstantlyFatal2: { colorName: 'var(--gga-color-modifier-12)', fallback: '#9c423a' },
      TotalDestruction: { colorName: 'var(--gga-color-modifier-13)', fallback: '#9c423a' },
    },
  },
  dark: {
    FP: {
      Rested: { colorName: 'var(--gga-color-modifier-0)', fallback: '#89bd5b' },
      Tiring: { colorName: 'var(--gga-color-modifier-1)', fallback: '#dddc98' },
      Tired: { colorName: 'var(--gga-color-modifier-4)', fallback: '#c38355' },
      Collapse: { colorName: 'var(--gga-color-modifier-6)', fallback: '#9c423a' },
      Unconscious: { colorName: 'var(--gga-color-modifier-12)', fallback: '#4e211d' },
    },

    HP: {
      Healthy: { colorName: 'var(--gga-color-modifier-0)', fallback: '#89bd5b' },
      Wounded: { colorName: 'var(--gga-color-modifier-2)', fallback: '#dddc98' },
      Reeling: { colorName: 'var(--gga-color-modifier-3)', fallback: '#c38355' },
      Collapse: { colorName: 'var(--gga-color-modifier-4)', fallback: '#9c423a' },
      DeathCheck1: { colorName: 'var(--gga-color-modifier-5)', fallback: '#9c423a' },
      DeathCheck2: { colorName: 'var(--gga-color-modifier-6)', fallback: '#9c423a' },
      DeathCheck3: { colorName: 'var(--gga-color-modifier-7)', fallback: '#9c423a' },
      DeathCheck4: { colorName: 'var(--gga-color-modifier-9)', fallback: '#9c423a' },
      Dead: { colorName: 'var(--gga-color-modifier-11)', fallback: '#9c423a' },
      Destroyed: { colorName: 'var(--gga-color-modifier-12)', fallback: '#9c423a' },
    },

    CI: {
      None: { colorName: 'var(--gga-color-modifier-0)', fallback: '#89bd5b' },
      Scratch: { colorName: 'var(--gga-color-modifier-1)', fallback: '#dddc98' },
      MinorWound1: { colorName: 'var(--gga-color-modifier-2)', fallback: '#dddc98' },
      MinorWound2: { colorName: 'var(--gga-color-modifier-3)', fallback: '#dddc98' },
      MinorWound3: { colorName: 'var(--gga-color-modifier-4)', fallback: '#dddc98' },
      MajorWound: { colorName: 'var(--gga-color-modifier-5)', fallback: '#c38355' },
      Reeling: { colorName: 'var(--gga-color-modifier-6)', fallback: '#9c423a' },
      Crippled1: { colorName: 'var(--gga-color-modifier-7)', fallback: '#9c423a' },
      Crippled2: { colorName: 'var(--gga-color-modifier-8)', fallback: '#9c423a' },
      MortalWound1: { colorName: 'var(--gga-color-modifier-9)', fallback: '#9c423a' },
      MortalWound2: { colorName: 'var(--gga-color-modifier-10)', fallback: '#9c423a' },
      InstantlyFatal1: { colorName: 'var(--gga-color-modifier-11)', fallback: '#9c423a' },
      InstantlyFatal2: { colorName: 'var(--gga-color-modifier-12)', fallback: '#9c423a' },
      TotalDestruction: { colorName: 'var(--gga-color-modifier-13)', fallback: '#9c423a' },
    },
  },
}

/* ---------------------------------------- */

export function getColorForState(key: string, state: string | undefined, theme: 'light' | 'dark' = 'light'): string {
  const finalFallback = '#808080'

  if (!state) return finalFallback
  const cacheRecord = ColorCache[theme][key]?.[state]

  return cacheRecord.colorName
}

/* ---------------------------------------- */

export function getTextForState(key: string, state: string | undefined): string {
  if (!state) return ''

  const localizationKey = key === 'CI' ? `GURPS.conditionalInjury.severity.${state}` : `GURPS.status.${state}`

  return game.i18n!.localize(localizationKey)
}
