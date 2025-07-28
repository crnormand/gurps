import fields = foundry.data.fields

/**
 * Convert a DataField instance into an HTML button fragment.
 * @param {DataField} field             The DataField instance to convert to an input
 * @param {object} options              Helper options
 * @returns {Handlebars.SafeString}
 */
function buttonGroup(field: fields.DataField.Any, options: any): Handlebars.SafeString {
  const { classes, label, hint, rootId, stacked, units, hidden, widget, value, ...inputConfig } = options.hash
  const groupConfig = {
    label,
    hint,
    rootId,
    stacked,
    widget,
    localize: inputConfig.localize,
    units,
    hidden,
    classes: typeof classes === 'string' ? classes.split(' ') : [],
  }
  if (!field) {
    console.error('Non-existent data field provided to {{formGroup}} handlebars helper.')
    return new Handlebars.SafeString('')
  }
  try {
    const group = field.toFormGroup(groupConfig, inputConfig)

    const button = document.createElement('button')
    button.innerText = value
    group.querySelector('input')?.replaceWith(button)

    return new Handlebars.SafeString(group.outerHTML)
  } catch (error) {
    console.error(error)
    return new Handlebars.SafeString('')
  }
}

/* ---------------------------------------- */

function print(value: any): void {
  console.log('**Handlebars Print**')
  console.log(value)
}

/* ---------------------------------------- */

export function registerGurpsHandlebarsHelpers() {
  Handlebars.registerHelper('buttonGroup', buttonGroup)
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
