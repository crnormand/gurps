import { systemPath } from './misc.js'

function registerPartials(): void {
  const templates = [
    'templates/action/partials/details-melee-attack.hbs',
    'templates/action/partials/details-ranged-attack.hbs',
    'templates/common/partials/tab-navigation.hbs',
    'templates/item/partials/details-base.hbs',
    'templates/item/partials/details-equipment.hbs',
    'templates/item/partials/details-skill.hbs',
    'templates/item/partials/details-spell.hbs',
    'templates/item/partials/details-trait.hbs',
  ]

  const templatePaths = Object.fromEntries(
    templates.map(template => {
      // Name: 'templates/path/to/my/partial.hbs' -> 'path.to.my.partial'
      const name = template.replace('templates/', '').replace('.hbs', '').replace(/\//g, '.')
      const filepath = systemPath(template)

      return [name, filepath]
    })
  )

  foundry.applications.handlebars.loadTemplates(templatePaths)
}

export const HandlebarsUtil = {
  registerPartials,
}
