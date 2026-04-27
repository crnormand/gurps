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

export async function resolveItemDropDetails(
  sheet: GurpsActorGcsSheet | GurpsActorModernSheet,
  event: DragEvent,
  item: Item.Implementation
): Promise<GurpsActorGcsSheet.ItemDropDetails | null> {
  if (!isHTMLElement(event.target)) return null

  const element = event.target

  // Phase A: Resolve drop target from DOM. dropTarget may be null when the user drops onto
  // an empty section — in that case the item becomes a top-level item (containedBy = null).
  const dropTarget = element.closest<HTMLElement>('[data-item-id]')
  let target: Item.Implementation | null = dropTarget
    ? (sheet.actor.items.get(dropTarget.dataset.itemId!) ?? null)
    : null

  // Phase B: Validate that the dropped item and the target item are the same type.
  if (target && target.type !== item.type) {
    ui.notifications?.warn('GURPS.dragDrop.itemTypeMismatch', { localize: true })

    return null
  }

  // Phase C: Determine whether the item will be "carried" or "other" equipment. When there is
  // a target item, inherit its carried state. Otherwise read the section table from the DOM.
  let carried = true

  if (target?.isOfType(ItemType.Equipment)) {
    carried = target.system.carried
  } else {
    const tableId = element.closest<HTMLElement>('[data-table-id]')?.dataset.tableId

    carried = tableId === 'carriedEquipment'
  }

  // Phase D: When dropping onto an existing item, ask the user whether the dropped item should
  // land before the target or inside it (as a child). Empty-section drops skip this dialog and
  // go straight to the top level.
  const dropPosition = target ? await resolveItemDropPosition(target) : null

  // null means the user cancelled the dialog — abort. (For empty-section drops dropPosition is
  // also null, but target is null too, so this guard only fires when the user had a choice.)
  if (target && dropPosition === null) return null

  // Phase E: Determine sort siblings, containedBy, and the target's container based on the
  // chosen drop position.
  //
  // Default (null drop position, i.e. empty-section drop):
  //   • siblings = all top-level items of this type in the target section
  //   • containedBy = null (top-level)
  //   • targetContainer = null
  let siblings = sheet.actor.system.getCollectionForItemType(item.type, carried)
  let containedBy: string | null = null
  let targetContainer: Item.Implementation | null = null

  if (dropPosition === 'inside') {
    // The target item becomes the new container. The first child becomes the sort anchor so
    // the dropped item is inserted before it.
    containedBy = dropTarget!.dataset.itemId!
    targetContainer = target
    siblings = target?.system.children ?? []
    target = siblings[0] ?? null
  } else if (dropPosition === 'before') {
    // Inherit the target item's container as the new parent, and sort among its siblings.
    containedBy = target?.system.containedBy ?? null
    targetContainer = target?.system.container ?? null
    if (targetContainer) siblings = targetContainer.system.children
  }

  // Phase F: Calculate sort values.
  //
  // performIntegerSort uses strict reference equality (sib === target) to locate the target
  // within the siblings array. Re-resolve the target from within siblings first to guarantee
  // the reference matches, guarding against any staleness between data-preparation cycles.
  const sortTarget = target
    ? (siblings.find(sibling => sibling === target) ?? siblings.find(sibling => sibling.id === target.id) ?? null)
    : null

  const sortUpdates = foundry.utils.performIntegerSort(item, { target: sortTarget, siblings, sortBefore: true })

  // Use reference equality (not _id vs id) to find item's own update entry.
  const sort = sortUpdates.find(sortUpdate => sortUpdate.target === item)?.update.sort

  // Phase G: Initialise the details accumulator.
  const details: GurpsActorGcsSheet.ItemDropDetails = {
    updates: [],
    creations: [],
    deletions: [],
  }

  // Push sort updates for any siblings that need reindexing (the reindex case in
  // performIntegerSort returns updates for all siblings, not just the dropped item).
  const siblingSortData = sortUpdates
    .filter(sortUpdate => sortUpdate.target !== item)
    .map(sortUpdate => ({ _id: sortUpdate.target._id, sort: sortUpdate.update.sort }) as Item.UpdateData)

  if (siblingSortData.length > 0) {
    details.updates.push({ data: siblingSortData, operation: { parent: sheet.actor } })
  }

  // Phase H: Equipment-specific handling. Equipment requires a quantity prompt so the user can
  // transfer only part of a stack. The behaviour then diverges based on actor origin.
  if (item.isOfType(ItemType.Equipment)) {
    // Skip the dialog when there is only one item — the entire stack is always transferred.
    const transferredQuantity = item.system.count === 1 ? 1 : await resolveItemDropQuantity(item)

    if (transferredQuantity === null) return null

    const remainingQuantity = item.system.count - transferredQuantity

    if (item.actor !== sheet.actor) {
      // Cross-actor transfer: create a copy on this actor with the transferred quantity and
      // fresh IDs for the item and all its descendants.
      const newItemData = foundry.utils.mergeObject(item.toObject(), {
        _id: foundry.utils.randomID(),
        system: { count: transferredQuantity, containedBy, _carried: carried },
        sort,
      })
      const newChildData = item.system.children.flatMap(child =>
        buildItemCopyWithChildren(child as Item.OfType<ItemType.Equipment>, newItemData._id, carried)
      ) as Item.CreateData[]

      details.creations.push({
        data: [newItemData, ...newChildData],
        operation: { parent: sheet.actor, keepId: true },
      })
      details.notification = game.i18n!.format('GURPS.dragDrop.equipmentTransferred', {
        count: String(transferredQuantity),
        itemName: item.name,
        sourceName: item.actor?.name ?? '?',
        targetName: sheet.actor.name,
      })

      // If the user cannot modify the source item, fall back to a copy-only drop.
      if (item.isOwner) {
        if (remainingQuantity <= 0) {
          // Delete the item and all its descendants — children are not automatically cascade-deleted
          // when their container is removed, so we must include them explicitly.
          const allSourceIds = [item.id!, ...item.system.allContents.map(descendant => descendant.id!)]

          details.deletions.push({ ids: allSourceIds, operation: { parent: item.parent! } })
        } else {
          details.updates.push({
            data: [{ _id: item._id, 'system.count': remainingQuantity } as Item.UpdateData],
            operation: { parent: item.parent! },
          })
        }
      }
    } else {
      // Same-actor move or stack split.

      // Guard against circular containment before doing anything else.
      if (
        (target && item.system.containsItem(target)) ||
        (targetContainer && item.system.containsItem(targetContainer))
      ) {
        ui.notifications?.warn('GURPS.dragDrop.itemContainerLoop', { localize: true })

        return null
      }

      // Children always need their _carried state synced with the item's new location.
      const childCarriedUpdates = item.system.children.map(child => ({
        _id: child._id,
        'system._carried': carried,
      })) as Item.UpdateData[]

      if (remainingQuantity > 0) {
        // Splitting the stack: move the transferred portion to the drop location and leave the
        // remainder in place. Children are duplicated so both stacks have copies.
        const newItemData = foundry.utils.mergeObject(item.toObject(), {
          _id: foundry.utils.randomID(),
          system: { count: transferredQuantity, containedBy, _carried: carried },
          sort,
        })
        const newChildData = item.system.children.flatMap(child =>
          buildItemCopyWithChildren(child as Item.OfType<ItemType.Equipment>, newItemData._id, carried)
        ) as Item.CreateData[]

        details.creations.push({
          data: [newItemData, ...newChildData],
          operation: { parent: sheet.actor, keepId: true },
        })
        details.updates.push({
          data: [{ _id: item._id, 'system.count': remainingQuantity } as Item.UpdateData, ...childCarriedUpdates],
          operation: { parent: sheet.actor },
        })
      } else {
        // Moving the full stack: one batched update covers the item and all its children.
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
    }

    return details
  }

  // Phase I: Non-equipment items (traits, skills, spells). These are always copied when moving
  // between actors — there is no quantity to transfer and no deletion on the source.
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
    // Same actor: guard circular containment then update containedBy and sort position.
    if (
      (target && item.system.containsItem(target)) ||
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

type ColorCacheRecord = Record<string, { colorName: string; fallback: string }>

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

export function getColorForState(key: string, state: string | undefined, theme: 'light' | 'dark' = 'light'): string {
  const finalFallback = '#808080'

  if (!state) return finalFallback
  const cacheRecord = ColorCache[theme][key]?.[state]

  return cacheRecord.colorName
}

export function getTextForState(key: string, state: string | undefined): string {
  if (!state) return ''

  const localizationKey = key === 'CI' ? `GURPS.conditionalInjury.severity.${state}` : `GURPS.status.${state}`

  return game.i18n!.localize(localizationKey)
}
