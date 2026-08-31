import { DeepPartial } from 'fvtt-types/utils'
import { GurpsSettingsApplication } from '../utilities/gurps-settings-application.js'
import { ALWAYS_IN_PLAY, CombatOptionSection, configurableOptions, isManeuverEnabled } from './combat-options.ts'
import Maneuvers from './maneuver.js'
import { getCombatOptionSettings } from './settings.ts'
import { ICON, MODULE_NAME, SETTING_COMBAT_OPTIONS, SETTING_USE_ON_TARGET, SETTINGS } from './types.ts'

/**
 * Registered here rather than in settings.ts: the menu needs the dialog, the dialog needs the
 * maneuver registry, and the maneuver registry needs the settings. Keeping the one edge that closes
 * that loop out of settings.ts is what keeps the module's imports acyclic.
 */
export function registerCombatSettingsMenu(): void {
  game.settings?.registerMenu(GURPS.SYSTEM_NAME, MODULE_NAME, {
    name: `${SETTINGS}.title`,
    label: `${SETTINGS}.title`,
    hint: `${SETTINGS}.hint`,
    icon: ICON,
    type: CombatSettingsApplication,
    restricted: true,
  })
}

/* ---------------------------------------- */

/** The Modifier Bucket's three combat sections, under the headings it uses for them. */
const SECTIONS: { key: CombatOptionSection; label: string }[] = [
  { key: 'melee', label: 'GURPS.meleeAttack' },
  { key: 'ranged', label: 'GURPS.ranged' },
  { key: 'defense', label: 'GURPS.defense' },
]

/**
 * The Combat Settings dialog: the module's plain settings, rendered the way every module's are, and
 * below them what this campaign has adopted -- the maneuvers in play and the stand-alone attack and
 * defense options offered in the Modifier Bucket. A modifier that defines a maneuver is not listed:
 * it follows the maneuver's checkbox.
 *
 * On Target, one of the plain settings above, introduces maneuvers and options of its own, so a
 * checkbox that can't take effect while that source is off is disabled with a tooltip saying so
 * rather than left to be ticked with no result.
 */
class CombatSettingsApplication extends GurpsSettingsApplication {
  constructor(options?: any) {
    super({ title: game.i18n!.localize(`${SETTINGS}.title`), module: MODULE_NAME, icon: ICON }, options)
  }

  static override DEFAULT_OPTIONS = {
    ...GurpsSettingsApplication.DEFAULT_OPTIONS,
    form: {
      ...GurpsSettingsApplication.DEFAULT_OPTIONS.form,
      handler: CombatSettingsApplication.#onSubmit,
    },
  }

  static override PARTS = {
    main: {
      scrollable: ['settings-list'],
      template: 'systems/gurps/templates/combat/settings.hbs',
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: foundry.applications.api.ApplicationV2.RenderOptions & { isFirstRender: boolean }
  ): Promise<foundry.applications.api.ApplicationV2.RenderContext> {
    const context = await super._prepareContext(options)

    const settings = getCombatOptionSettings()
    const localize = (key: string) => game.i18n?.localize(key) ?? key

    // The On Target rows are listed whether or not that source is in use; _onRender disables them
    // while it is off, so ticking On Target above lights them up without saving and reopening. The
    // always-in-play maneuvers are left out rather than shown ticked and unclickable -- a checkbox
    // that can never be anything else is noise in a list this long.
    const maneuvers = Object.entries(Maneuvers.getAllPossible())
      .filter(([key]) => !ALWAYS_IN_PLAY.includes(key))
      .map(([key, maneuver]: [string, any]) => ({
        key,
        label: localize(maneuver.data.label),
        img: maneuver.img,
        requiresOnTarget: maneuver.requiresOnTarget,
        enabled: isManeuverEnabled(key, settings),
      }))

    const sections = SECTIONS.map(section => ({
      label: localize(section.label),
      options: configurableOptions()
        .filter(option => option.section === section.key)
        .map(option => ({
          id: option.id,
          label: `${option.mod} ${localize(`GURPS.modifiers_.${option.id}`)}`,
          pdf: localize(`GURPS.modifiers_.pdf.${option.id}`),
          requiresOnTarget: !!option.requiresOnTarget,
          enabled: settings.options?.[option.id] !== false,
        })),
    }))

    return foundry.utils.mergeObject(context, { maneuvers, sections })
  }

  /* ---------------------------------------- */

  // ApplicationV2 keeps the outer form across re-renders, so this listener is attached once rather
  // than stacking a duplicate on every render.
  protected override async _onFirstRender(
    context: foundry.applications.api.ApplicationV2.RenderContext,
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>
  ): Promise<void> {
    await super._onFirstRender(context, options)

    this.element.addEventListener('change', event => {
      if ((event.target as HTMLInputElement).name === this.#onTargetInputName) this.#refreshDependentRows()
    })
  }

  /* ---------------------------------------- */

  protected override async _onRender(
    context: foundry.applications.api.ApplicationV2.RenderContext,
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions>
  ): Promise<void> {
    await super._onRender(context, options)

    this.#refreshDependentRows()
  }

  /* ---------------------------------------- */

  /** The Use On Target checkbox is one of the plain settings, named the way the base dialog names them. */
  get #onTargetInputName(): string {
    return `${GURPS.SYSTEM_NAME}.${SETTING_USE_ON_TARGET}`
  }

  /**
   * A row from a source that is off can't reach the Modifier Bucket, so it is disabled and told why.
   * Reading checkbox state back from the DOM on submit (rather than from the form data, which skips
   * disabled inputs) is what lets a GM turn On Target back on and find their choices intact.
   */
  #refreshDependentRows(): void {
    const form = this.element as HTMLFormElement
    const useOnTarget =
      form.querySelector<HTMLInputElement>(`input[name="${this.#onTargetInputName}"]`)?.checked ?? false

    for (const row of form.querySelectorAll<HTMLElement>('.gga-option-row')) {
      const needsOnTarget = row.dataset.requiresOnTarget === 'true' && !useOnTarget

      const checkbox = row.querySelector<HTMLInputElement>('input[type="checkbox"]')
      if (checkbox) checkbox.disabled = needsOnTarget

      row.classList.toggle('needs-on-target', needsOnTarget)

      if (needsOnTarget) row.dataset.tooltip = game.i18n?.localize('GURPS.settingCombatOptionsNeedsOnTarget')
      else delete row.dataset.tooltip
    }
  }

  /* ---------------------------------------- */

  static async #onSubmit(event: SubmitEvent | Event, form: HTMLFormElement, formData: FormDataExtended): Promise<void> {
    // The plain settings are named inputs and save the way every module's do. The maneuver and option
    // checkboxes are unnamed, so they never reach the form data; they are read from the DOM instead,
    // because a disabled checkbox submits nothing and the choices a GM made before turning On Target
    // off should survive turning it back on.
    await GurpsSettingsApplication.update(event, form, formData)

    const collect = (kind: string) =>
      Object.fromEntries(
        Array.from(form.querySelectorAll<HTMLInputElement>(`input[data-kind="${kind}"]`)).map(input => [
          input.dataset.key,
          input.checked,
        ])
      )

    await game.settings?.set(GURPS.SYSTEM_NAME, SETTING_COMBAT_OPTIONS, {
      maneuvers: collect('maneuver'),
      options: collect('option'),
    })
  }
}
