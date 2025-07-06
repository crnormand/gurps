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

export function registerGurpsHandlebarsHelpers() {
  Handlebars.registerHelper('buttonGroup', buttonGroup)
}

/* ---------------------------------------- */

export function registerHandlebarsPartials() {
  const templates = [
    'actor.sections.advantages',
    'actor.sections.attributes',
    'actor.sections.basic-attributes',
    'actor.sections.ci-editor',
    'actor.sections.conditional-injury',
    'actor.sections.conditionalmods',
    'actor.sections.conditions',
    'actor.sections.description',
    'actor.sections.dr-tooltip',
    'actor.sections.encumbrance',
    'actor.sections.footer',
    'actor.sections.equipment',
    'actor.sections.hpfp-editor',
    'actor.sections.hpfp-tracker',
    'actor.sections.identity',
    'actor.sections.lifting',
    'actor.sections.locations',
    'actor.sections.combat-status',
    'actor.sections.combat-info',
    'actor.sections.melee',
    'actor.sections.miscellaneous',
    'actor.sections.notes',
    'actor.sections.points',
    'actor.sections.portrait',
    'actor.sections.quicknote',
    'actor.sections.ranged',
    'actor.sections.reactions',
    'actor.sections.resource-controls',
    'actor.sections.resource-tracker',
    'actor.sections.secondary-attributes',
    'actor.sections.skills',
    'actor.sections.speed-range-table',
    'actor.sections.spells',
    'actor.sections.trackers',
    'item.sections.items',
    'item.sections.features',
    'item.sections.skill',
    'item.sections.spell',
    // New partials
    'actor.parts.item-reference',
    'actor.parts.item-controls',
  ]

  templates.forEach(name => {
    const fileName = `systems/gurps/templates/${name.replace(/\./g, '/')}.hbs`
    fetch(fileName)
      .then(response => response.text())
      .then(template => Handlebars.registerPartial(name, template))
  })
}
