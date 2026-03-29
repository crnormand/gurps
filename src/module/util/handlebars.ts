import { systemPath } from './misc.js'

async function registerPartials(): Promise<void> {
  const templates = ['templates/common/partials/tab-navigation.hbs', 'templates/item/partials/equipment.hbs']

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
}
