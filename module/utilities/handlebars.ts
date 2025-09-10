function print(value: any): void {
  console.log('**Handlebars Print**')
  console.log(value)
}

/* ---------------------------------------- */

export function registerGurpsHandlebarsHelpers() {
  Handlebars.registerHelper('print', print)
}

/* ---------------------------------------- */

export function registerHandlebarsPartials() {
  // const templates = ['actor.parts.item-reference', 'actor.parts.item-controls']
  const templates: string[] = []

  templates.forEach(name => {
    const fileName = `systems/gurps/templates/${name.replace(/\./g, '/')}.hbs`
    fetch(fileName)
      .then(response => response.text())
      .then(template => Handlebars.registerPartial(name, template))
  })
}
