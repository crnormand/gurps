// define an object with two fields: title and icon.
type GurpsSettingsConfig = {
  title: string // Title of the Settings window.
  module: string // Name of the GURPS module.
  icon?: string // Icon to display in the title bar.
}

/**
 * GURPS Settings Application.
 * 
 * This application is used to display and manage settings for a specific GURPS module. Settings are determined by the 
 * module name passed in the constructor.
 *
 * Pass in a configuration object with the following fields:
 * - title: The title of the settings window.
 * - module: The name of the GURPS module for which settings are being managed.
 * - icon: (optional) The icon to display in the title bar.
 * 
 * Module settings are registered with the namespace `gurps.<module>.<settingId>`.
 * For example, if the module is "damage", a setting with ID "useArmorDivisor" would be registered as 
 * `gurps.damage.useArmorDivisor`.
 *
 */

export class GurpsSettingsApplication extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor(config: GurpsSettingsConfig, options?: any) {
    super(options)
    this._title = config.title
    this._module = config.module
    this.options.window.icon = config.icon ?? 'fa-solid fa-gears'
  }

  private _title: string
  private _module: string

  override get title() {
    return this._title
  }

  static override DEFAULT_OPTIONS = {
    classes: ['gga', 'standard-form'],
    form: {
      closeOnSubmit: true,
      handler: GurpsSettingsApplication.update,
    },
    id: 'gga-settings',
    position: {
      width: 600,
      height: 600,
    },
    tag: 'form',
    window: {
      resizable: true,
      icon: 'fa-light fa-face-head-bandage',
    },
  }

  static override PARTS = {
    main: {
      scrollable: ['settings-list'],
      template: 'systems/gurps/templates/damage/settings.hbs',
    },
  }

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions & { isFirstRender: boolean }
  ): Promise<foundry.applications.api.ApplicationV2.RenderContext> {
    const context = await super._prepareContext(options)

    const settings =
      (Array.from(game.settings!.settings.values()).filter((s: any) =>
        s.id.startsWith(`gurps.${this._module}.`)
      ) as any) || []

    // go through all settings, and collect their values
    for (const setting of settings) setting.value = game.settings!.get(GURPS.SYSTEM_NAME, setting.key as any)

    const result = foundry.utils.mergeObject(context, {
      settings: settings,
    })
    return result
  }

  static async update(event: SubmitEvent | Event, form: HTMLFormElement, formData: FormDataExtended): Promise<void> {
    event.preventDefault()
    event.stopPropagation()

    const data = foundry.utils.expandObject(formData) as Record<string, any>

    data
      .keys()
      .toArray()
      .forEach(async (key: any) => {
        const namespace = key.split('.')[0]
        const settingId = key.split('.').slice(1).join('.')
        if (namespace !== GURPS.SYSTEM_NAME) {
          console.warn(`GURPS | GurpsSettingsApplication.update: Skipping setting ${key} with namespace ${namespace}`)
          return
        }

        await game.settings!.set(GURPS.SYSTEM_NAME, settingId, data.object[key])
      })
  }
}
