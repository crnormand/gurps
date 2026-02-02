import fields = foundry.data.fields

// define an object with two fields: title and icon.
type GurpsSettingsConfig = {
  title: string // Title of the Settings window.
  module: string // Name of the GURPS module.
  icon?: string // Icon to display in the title bar.
}

type SettingEntry<Field extends fields.DataField = fields.DataField.Any> = {
  value?: fields.DataField.PersistedTypeFor<Field>
  field?: Field
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
      template: 'systems/gurps/templates/settings.hbs',
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

    const entries: SettingEntry[] = []

    // go through all settings, and convert them to modern data fields if not already converted.
    // also, collect values and localized labels and hints.
    for (const setting of settings) {
      const entry: SettingEntry = { value: game.settings!.get(GURPS.SYSTEM_NAME, setting.key as any) }

      if (setting.type instanceof fields.DataField) {
        entry.field = setting.type
      } else if (setting.type === Boolean) {
        entry.field = new fields.BooleanField({ initial: setting.default ?? false })
      } else if (setting.type === Number) {
        const { min, max, step } = setting.range ?? {}

        entry.field = new fields.NumberField({
          required: true,
          choices: setting.choices,
          initial: setting.default,
          min,
          max,
          step,
        })
      } else {
        entry.field = new fields.StringField({
          required: true,
          nullable: false,
          choices: setting.choices,
          initial: setting.default,
        })
      }

      entry.field!.name = `${setting.namespace}.${setting.key}`
      entry.field!.label ||= game.i18n!.localize(setting.name ?? '')
      entry.field!.hint ||= game.i18n!.localize(setting.hint ?? '')

      entries.push(entry)
    }

    const result = foundry.utils.mergeObject(context, {
      entries,
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
