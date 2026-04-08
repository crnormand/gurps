import { systemPath } from '@module/util/misc.js'
import { ActorType } from '../types.js'
import { ItemType } from '../../item/types.js'

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

export async function resolveItemDropPosition(item: Item.Implementation): Promise<'before' | 'inside' | null> {
  return await foundry.applications.api.DialogV2.wait({
    window: { title: item.name },
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
        icon: 'fas fa-sign-in-alt',
        label: 'GURPS.dropInside',
      },
    ],
  })
}

/* ---------------------------------------- */

export async function resolveItemDropQuantity(item: Item.OfType<ItemType.Equipment>): Promise<number | null> {
  const max = item.system.count

  return await foundry.applications.api.DialogV2.wait({
    window: { title: item.name },
    content: `
<p>${game.i18n!.localize('GURPS.splitQuantity')}</p>
<div class="form-group">
<label>${game.i18n!.localize('GURPS.quantity')}</label>
  <div class="form-fields">
    <input type="number" name="quantity" min="0" max="${max}"/>
  </div>
</div>`,
    buttons: [
      {
        action: 'confirm',
        icon: 'fa-solid fa-check',
        label: 'GURPS.ok',
        default: true,
        callback: (_event, button, _dialog): number => {
          const input = button.form?.elements.namedItem('quantity') as HTMLInputElement

          if (!input) return 0

          return parseInt(input.value) || 0
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
