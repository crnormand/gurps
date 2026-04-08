import { gurpslink } from '@util/gurpslink.js'

import { systemPath } from './misc.js'

async function registerHelpers(): Promise<void> {
  function pdfReference(reference: string): Handlebars.SafeString {
    const references = reference.split(',').map(ref => ref.trim())

    const refElements = references
      .map(ref => {
        if (ref.match(/https?:\/\//i)) return `<a href="${ref}">*Link</a>`
        else return gurpslink(`[PDF:${ref}]`)
      })
      .join(', ')

    return new Handlebars.SafeString(refElements)
  }

  /* ---------------------------------------- */

  function signed(num: number): string {
    return num >= 0 ? `+${num}` : `${num}`
  }

  /* ---------------------------------------- */

  Handlebars.registerHelper({ pdfReference, signed })
}

async function registerPartials(): Promise<void> {
  const templates = [
    'templates/actor/modern/partials/add-row.hbs',
    'templates/actor/modern/partials/attack-table.hbs',
    'templates/actor/modern/partials/data-table.hbs',
    'templates/actor/modern/partials/dice-button.hbs',
    'templates/actor/modern/partials/encumbrance-table.hbs',
    'templates/actor/modern/partials/equipment-table.hbs',
    'templates/actor/modern/partials/hitlocations-table.hbs',
    'templates/actor/modern/partials/item-table.hbs',
    'templates/actor/modern/partials/modifier-button.hbs',
    'templates/actor/modern/partials/modifiers-table.hbs',
    'templates/actor/modern/partials/ms-attributes.hbs',
    'templates/actor/modern/partials/ms-identity.hbs',
    'templates/actor/partials/resource-tracker.hbs',
    'templates/actor/modern/partials/ms-portrait.hbs',
    'templates/actor/modern/partials/ms-resource-tracker.hbs',
    'templates/actor/modern/partials/ms-resources.hbs',
    'templates/actor/modern/partials/ms-secondary-stats.hbs',
    'templates/actor/modern/partials/resource-bar.hbs',
    'templates/actor/modern/partials/row-actions.hbs',
    'templates/actor/modern/partials/row-notes.hbs',
    'templates/actor/modern/partials/section-header.hbs',
    'templates/actor/modern/partials/traits-table.hbs',
  ]

  templates.forEach(filename => {
    // Name: 'templates/path/to/my/partial.hbs' -> 'path.to.my.partial'
    const name = filename.replace('templates/', '').replace('.hbs', '').replace(/\//g, '.')

    fetch(systemPath(filename))
      .then(file => file.text())
      .then(async content => {
        Handlebars.registerPartial(name, content)
      })
  })
}

export const HandlebarsUtil = {
  registerPartials,
  registerHelpers,
}
