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

export async function resolveItemDropQuantity(item: Item.OfType<'equipmentV2'>): Promise<number | null> {
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
        callback: (_event, button, _dialog) => {
          const input = button.form?.elements.namedItem('quantity') as HTMLInputElement

          if (!input) return null

          return parseInt(input.value) || 0
        },
      },
      {
        action: 'transferAll',
        icon: 'fa-solid fa-angles-right',
        label: 'GURPS.transferAll',
        callback: () => max,
      },
    ],
  })
}
