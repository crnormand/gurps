import { systemPath } from './misc.js'

async function registerPartials(): Promise<void> {
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

  await Promise.all(
    templates.map(async filename => {
      // Name: 'templates/path/to/my/partial.hbs' -> 'path.to.my.partial'
      const name = filename.replace('templates/', '').replace('.hbs', '').replace(/\//g, '.')
      const content = await fetch(systemPath(filename)).then(file => file.text())

      Handlebars.registerPartial(name, content)
    })
  )
}

export const HandlebarsUtil = {
  registerPartials,
}
