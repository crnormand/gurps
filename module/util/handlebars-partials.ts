export async function preloadHandlebarsTemplates() {
  const partials = ['systems/gurps/templates/actor/parts/portrait.hbs']

  const paths: Record<string, string> = {}

  /** Convert list of partial paths to dot notation
   * Gets rid of everything before and including "templates/"
   * and removes the file extension
   * such that `systems/gurps/templates/actors/parts/portrait.hbs`
   * becomes `gurps.actors.parts.portrait`
   * */
  for (const partial of partials) {
    paths[`gurps.${partial.replace('.hbs', '').split('templates/')[1].replaceAll('/', '.')}`] = partial
  }

  return loadTemplates(paths)
}
