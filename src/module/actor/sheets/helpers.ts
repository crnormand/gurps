import { systemPath } from '@module/util/misc.js'

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

export async function openQuickNotesEditor(actor: Actor.OfType<'characterV2'>): Promise<void> {
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

type ColorCacheRecord = Record<string, { colorName: string; color: string | null; fallback: string }>

const ColorCache: Record<string, Record<string, ColorCacheRecord>> = {
  light: {
    FP: {
      Rested: { colorName: 'var(--gga-color-modifier-0)', color: null, fallback: '#89bd5b' },
      Tiring: { colorName: 'var(--gga-color-modifier-1)', color: null, fallback: '#dddc98' },
      Tired: { colorName: 'var(--gga-color-modifier-4)', color: null, fallback: '#c38355' },
      Collapse: { colorName: 'var(--gga-color-modifier-6)', color: null, fallback: '#9c423a' },
      Unconscious: { colorName: 'var(--gga-color-modifier-12)', color: null, fallback: '#4e211d' },
    },

    HP: {
      Healthy: { colorName: 'var(--gga-color-modifier-0)', color: null, fallback: '#89bd5b' },
      Wounded: { colorName: 'var(--gga-color-modifier-1)', color: null, fallback: '#dddc98' },
      Reeling: { colorName: 'var(--gga-color-modifier-4)', color: null, fallback: '#c38355' },
      Collapse: { colorName: 'var(--gga-color-modifier-6)', color: null, fallback: '#9c423a' },
      DeathCheck1: { colorName: 'var(--gga-color-modifier-8)', color: null, fallback: '#9c423a' },
      DeathCheck2: { colorName: 'var(--gga-color-modifier-9)', color: null, fallback: '#9c423a' },
      DeathCheck3: { colorName: 'var(--gga-color-modifier-10)', color: null, fallback: '#9c423a' },
      DeathCheck4: { colorName: 'var(--gga-color-modifier-11)', color: null, fallback: '#9c423a' },
      Dead: { colorName: 'var(--gga-color-modifier-12)', color: null, fallback: '#9c423a' },
      Destroyed: { colorName: 'var(--gga-color-modifier-12)', color: null, fallback: '#9c423a' },
    },

    CI: {
      None: { colorName: 'var(--gga-color-modifier-0)', color: null, fallback: '#89bd5b' },
      Scratch: { colorName: 'var(--gga-color-modifier-1)', color: null, fallback: '#dddc98' },
      MinorWound1: { colorName: 'var(--gga-color-modifier-2)', color: null, fallback: '#dddc98' },
      MinorWound2: { colorName: 'var(--gga-color-modifier-3)', color: null, fallback: '#dddc98' },
      MinorWound3: { colorName: 'var(--gga-color-modifier-4)', color: null, fallback: '#dddc98' },
      MajorWound: { colorName: 'var(--gga-color-modifier-5)', color: null, fallback: '#c38355' },
      Reeling: { colorName: 'var(--gga-color-modifier-6)', color: null, fallback: '#9c423a' },
      Crippled1: { colorName: 'var(--gga-color-modifier-7)', color: null, fallback: '#9c423a' },
      Crippled2: { colorName: 'var(--gga-color-modifier-8)', color: null, fallback: '#9c423a' },
      MortalWound1: { colorName: 'var(--gga-color-modifier-9)', color: null, fallback: '#9c423a' },
      MortalWound2: { colorName: 'var(--gga-color-modifier-10)', color: null, fallback: '#9c423a' },
      InstantlyFatal1: { colorName: 'var(--gga-color-modifier-11)', color: null, fallback: '#9c423a' },
      InstantlyFatal2: { colorName: 'var(--gga-color-modifier-12)', color: null, fallback: '#9c423a' },
      TotalDestruction: { colorName: 'var(--gga-color-modifier-13)', color: null, fallback: '#9c423a' },
    },
  },
  dark: {
    FP: {
      Rested: { colorName: 'var(--gga-color-modifier-0)', color: null, fallback: '#89bd5b' },
      Tiring: { colorName: 'var(--gga-color-modifier-1)', color: null, fallback: '#dddc98' },
      Tired: { colorName: 'var(--gga-color-modifier-4)', color: null, fallback: '#c38355' },
      Collapse: { colorName: 'var(--gga-color-modifier-6)', color: null, fallback: '#9c423a' },
      Unconscious: { colorName: 'var(--gga-color-modifier-12)', color: null, fallback: '#4e211d' },
    },

    HP: {
      Healthy: { colorName: 'var(--gga-color-modifier-0)', color: null, fallback: '#89bd5b' },
      Wounded: { colorName: 'var(--gga-color-modifier-2)', color: null, fallback: '#dddc98' },
      Reeling: { colorName: 'var(--gga-color-modifier-3)', color: null, fallback: '#c38355' },
      Collapse: { colorName: 'var(--gga-color-modifier-4)', color: null, fallback: '#9c423a' },
      DeathCheck1: { colorName: 'var(--gga-color-modifier-5)', color: null, fallback: '#9c423a' },
      DeathCheck2: { colorName: 'var(--gga-color-modifier-6)', color: null, fallback: '#9c423a' },
      DeathCheck3: { colorName: 'var(--gga-color-modifier-7)', color: null, fallback: '#9c423a' },
      DeathCheck4: { colorName: 'var(--gga-color-modifier-9)', color: null, fallback: '#9c423a' },
      Dead: { colorName: 'var(--gga-color-modifier-11)', color: null, fallback: '#9c423a' },
      Destroyed: { colorName: 'var(--gga-color-modifier-12)', color: null, fallback: '#9c423a' },
    },

    CI: {
      None: { colorName: 'var(--gga-color-modifier-0)', color: null, fallback: '#89bd5b' },
      Scratch: { colorName: 'var(--gga-color-modifier-1)', color: null, fallback: '#dddc98' },
      MinorWound1: { colorName: 'var(--gga-color-modifier-2)', color: null, fallback: '#dddc98' },
      MinorWound2: { colorName: 'var(--gga-color-modifier-3)', color: null, fallback: '#dddc98' },
      MinorWound3: { colorName: 'var(--gga-color-modifier-4)', color: null, fallback: '#dddc98' },
      MajorWound: { colorName: 'var(--gga-color-modifier-5)', color: null, fallback: '#c38355' },
      Reeling: { colorName: 'var(--gga-color-modifier-6)', color: null, fallback: '#9c423a' },
      Crippled1: { colorName: 'var(--gga-color-modifier-7)', color: null, fallback: '#9c423a' },
      Crippled2: { colorName: 'var(--gga-color-modifier-8)', color: null, fallback: '#9c423a' },
      MortalWound1: { colorName: 'var(--gga-color-modifier-9)', color: null, fallback: '#9c423a' },
      MortalWound2: { colorName: 'var(--gga-color-modifier-10)', color: null, fallback: '#9c423a' },
      InstantlyFatal1: { colorName: 'var(--gga-color-modifier-11)', color: null, fallback: '#9c423a' },
      InstantlyFatal2: { colorName: 'var(--gga-color-modifier-12)', color: null, fallback: '#9c423a' },
      TotalDestruction: { colorName: 'var(--gga-color-modifier-13)', color: null, fallback: '#9c423a' },
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
