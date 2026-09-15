import { settingsForModule } from '../module/utilities/gurps-settings-application.js'

const setting = (id: string, type: unknown) => ({ id, type })

describe('settingsForModule', () => {
  it('includes a setting registered under the module', () => {
    const settings = [setting('gurps.combat.use-on-target', Boolean)]

    expect(settingsForModule('combat', settings)).toEqual(settings)
  })

  it('omits a setting from another module', () => {
    const settings = [setting('gurps.pdf.basicset', String)]

    expect(settingsForModule('combat', settings)).toEqual([])
  })

  // The dialog renders anything that isn't a Boolean, Number or DataField as a text input, and
  // saves every field it rendered, so an Object setting would come back as "[object Object]".
  it('omits an Object setting, which has a dialog of its own', () => {
    const settings = [setting('gurps.combat.options', Object)]

    expect(settingsForModule('combat', settings)).toEqual([])
  })

  it('omits an Array setting', () => {
    const settings = [setting('gurps.combat.list', Array)]

    expect(settingsForModule('combat', settings)).toEqual([])
  })
})
