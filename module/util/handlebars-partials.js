export async function preloadHandlebarsTemplates() {
  const partials = [
    'systems/gurps/templates/actors/parts/portrait.hbs',
    `systems/gurps/templates/actors/parts/identity.hbs`,
    `systems/gurps/templates/actors/parts/misc.hbs`,
    `systems/gurps/templates/actors/parts/description.hbs`,
    `systems/gurps/templates/actors/parts/point-breakdown.hbs`,
    `systems/gurps/templates/actors/parts/attributes-primary.hbs`,
    `systems/gurps/templates/actors/parts/attributes-secondary.hbs`,
    `systems/gurps/templates/actors/parts/attributes-pool.hbs`,
    `systems/gurps/templates/actors/parts/status.hbs`,
    `systems/gurps/templates/actors/parts/hit-table.hbs`,
    `systems/gurps/templates/actors/parts/encumbrance-move.hbs`,
    `systems/gurps/templates/actors/parts/lifting-moving.hbs`,
    `systems/gurps/templates/actors/parts/quick-notes.hbs`,
    `systems/gurps/templates/actors/parts/conditional-modifiers.hbs`,
    `systems/gurps/templates/actors/parts/reactions.hbs`,
    `systems/gurps/templates/actors/parts/trackers.hbs`,
    `systems/gurps/templates/actors/parts/weapons-melee.hbs`,
    `systems/gurps/templates/actors/parts/weapons-ranged.hbs`,
    `systems/gurps/templates/actors/parts/traits.hbs`,
    `systems/gurps/templates/actors/parts/skills.hbs`,
    `systems/gurps/templates/actors/parts/spells.hbs`,
    `systems/gurps/templates/actors/parts/equipment-carried.hbs`,
    `systems/gurps/templates/actors/parts/equipment-other.hbs`,
    `systems/gurps/templates/actors/parts/notes.hbs`,
  ]

  /** @type Record<string,string> */
  const paths = {}

  /** Convert list of partial paths to dot notation
   * Gets rid of everything before and including "templates/"
   * and removes the file extension
   * such that `systems/gurps/templates/actors/parts/header.hbs`
   * becomes `gurps.actors.parts.header`
   * */
  for (const partial of partials) {
    paths[`gurps.${a.replace('.hbs', '').split('templates/')[1].replaceAll('/', '.')}`] = partial
  }

  return loadTemplates(paths)
}
