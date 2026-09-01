import { DeepPartial } from 'fvtt-types/utils'
import { ALWAYS_IN_PLAY, COMBAT_OPTIONS, CombatOptionSection, isManeuverEnabled } from './combat-options.ts'
import Maneuvers from './maneuver.js'
import { getCombatOptionSettings, isUsingOnTarget } from './settings.ts'
import { MODULE_NAME, SETTING_COMBAT_OPTIONS, SETTING_USE_ON_TARGET } from './types.ts'

/**
 * Registered here rather than in settings.ts: the menu needs the dialog, the dialog needs the
 * maneuver registry, and the maneuver registry needs the settings. Keeping the one edge that closes
 * that loop out of settings.ts is what keeps the module's imports acyclic.
 */
export function registerCombatOptionsMenu(): void {
  game.settings?.registerMenu(GURPS.SYSTEM_NAME, MODULE_NAME, {
    name: 'GURPS.settingCombatOptions',
    hint: 'GURPS.settingHintCombatOptions',
    label: 'GURPS.settingLabelCombatOptions',
    type: CombatOptionsSettings,
    restricted: true,
    icon: 'fa-solid fa-hand-fist',
  })
}

/* ---------------------------------------- */

/**
 * B365 groups the melee and ranged to-hit options under Attack Options and B374 groups the rest under
 * Defense Options, which is also how a GM thinks about adopting them.
 */
const GROUPS: { label: string; sections: { key: CombatOptionSection; label: string | null }[] }[] = [
  {
    label: 'GURPS.settingCombatOptionsAttack',
    sections: [
      { key: 'melee', label: 'GURPS.meleeAttack' },
      { key: 'ranged', label: 'GURPS.ranged' },
    ],
  },
  {
    label: 'GURPS.settingCombatOptionsDefense',
    sections: [{ key: 'defense', label: null }],
  },
]

/**
 * One dialog for the question "which combat options is this campaign using?": the On Target source
 * toggle, the maneuvers in play, and the attack/defense options offered in the Modifier Bucket.
 *
 * The three are coupled -- On Target introduces maneuvers, and a maneuver owns its options -- so a
 * checkbox that can't take effect is disabled with a tooltip saying what it is waiting on rather than
 * left to be ticked with no result.
 */
class CombatOptionsSettings extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static override DEFAULT_OPTIONS: DeepPartial<foundry.applications.api.ApplicationV2.Configuration> = {
    tag: 'form',
    id: 'combat-options',
    window: {
      title: 'GURPS.settingCombatOptions',
    },
    position: {
      width: 560,
      height: 760,
    },
    form: {
      handler: CombatOptionsSettings.#onSubmit,
      closeOnSubmit: true,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, foundry.applications.api.HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    main: {
      template: 'systems/gurps/templates/combat/options.hbs',
      scrollable: ['.gga-combat-options-scroll'],
    },
  }

  /* ---------------------------------------- */

  // Settings are registered before i18n is ready, so the title is localized at render time.
  override get title(): string {
    return game.i18n!.localize(this.options.window.title!)
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<foundry.applications.api.ApplicationV2.RenderOptions> & { isFirstRender: boolean }
  ): Promise<foundry.applications.api.ApplicationV2.RenderContext> {
    const context = await super._prepareContext(options)

    const settings = getCombatOptionSettings()
    const localize = (key: string) => game.i18n?.localize(key) ?? key

    const onTarget = {
      label: localize('GURPS.settingOnTarget'),
      hint: localize('GURPS.settingHintOnTarget'),
      enabled: isUsingOnTarget(),
    }

    // The On Target rows are listed whether or not that source is in use; _onRender disables them
    // while it is off, so turning it on above lights them up without saving and reopening. The
    // always-in-play maneuvers are left out rather than shown ticked and unclickable -- a checkbox
    // that can never be anything else is noise in a list this long.
    const maneuvers = Object.entries(Maneuvers.getAll())
      .filter(([key]) => !ALWAYS_IN_PLAY.includes(key))
      .map(([key, maneuver]: [string, any]) => ({
        key,
        label: localize(maneuver.data.label),
        img: maneuver.img,
        requiresOnTarget: maneuver.requiresOnTarget,
        enabled: isManeuverEnabled(key, settings),
      }))

    const maneuverLabels = new Map(maneuvers.map(maneuver => [maneuver.key, maneuver.label]))

    const groups = GROUPS.map(group => ({
      label: localize(group.label),
      sections: group.sections.map(section => ({
        label: section.label ? localize(section.label) : null,
        options: COMBAT_OPTIONS.filter(option => option.section === section.key).map(option => {
          const gating = option.maneuvers ?? []

          return {
            id: option.id,
            label: `${option.mod} ${localize(`GURPS.modifiers_.${option.id}`)}`,
            pdf: localize(`GURPS.modifiers_.pdf.${option.id}`),
            requiresOnTarget: !!option.requiresOnTarget,
            maneuverKeys: gating.join(' '),
            maneuverNames: gating.map(key => maneuverLabels.get(key) ?? key).join(', '),
            enabled: settings.options?.[option.id] !== false,
          }
        }),
      })),
    }))

    return foundry.utils.mergeObject(context, { onTarget, maneuvers, groups })
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
      const kind = (event.target as HTMLElement).dataset?.kind
      if (kind === 'maneuver' || kind === 'on-target') this.#refreshDependentRows()
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

  /**
   * A row that can't reach the Modifier Bucket -- its source is off, or every maneuver it belongs to
   * is out of play -- is disabled and told why. Reading checkbox state back from the DOM on submit
   * (rather than from the form data, which skips disabled inputs) is what lets a GM turn a maneuver
   * back on and find their option choices intact.
   */
  #refreshDependentRows(): void {
    const form = this.element as HTMLFormElement
    const useOnTarget = form.querySelector<HTMLInputElement>('input[data-kind="on-target"]')?.checked ?? false
    const isManeuverChecked = (key: string) =>
      form.querySelector<HTMLInputElement>(`input[data-kind="maneuver"][data-key="${key}"]`)?.checked ?? true

    for (const row of form.querySelectorAll<HTMLElement>('.gga-option-row')) {
      const keys = (row.dataset.maneuvers ?? '').split(' ').filter(key => key.length > 0)
      const needsOnTarget = row.dataset.requiresOnTarget === 'true' && !useOnTarget
      const orphaned = keys.length > 0 && !keys.some(key => isManeuverChecked(key))

      const checkbox = row.querySelector<HTMLInputElement>('input[type="checkbox"]')
      if (checkbox) checkbox.disabled = needsOnTarget || orphaned

      row.classList.toggle('needs-on-target', needsOnTarget)
      row.classList.toggle('orphaned', !needsOnTarget && orphaned)

      if (needsOnTarget) {
        row.dataset.tooltip = game.i18n?.localize('GURPS.settingCombatOptionsNeedsOnTarget')
      } else if (orphaned) {
        row.dataset.tooltip = game.i18n?.format('GURPS.settingCombatOptionsOrphaned', {
          maneuvers: row.dataset.maneuverNames ?? '',
        })
      } else {
        delete row.dataset.tooltip
      }
    }
  }

  /* ---------------------------------------- */

  static async #onSubmit(
    this: CombatOptionsSettings,
    _event: SubmitEvent | Event,
    form: HTMLFormElement,
    _formData: FormDataExtended
  ): Promise<void> {
    // Read the checkboxes rather than the form data: a disabled checkbox submits nothing, and the
    // choices a GM made before turning a maneuver off should survive turning it back on.
    const collect = (kind: string) =>
      Object.fromEntries(
        Array.from(form.querySelectorAll<HTMLInputElement>(`input[data-kind="${kind}"]`)).map(input => [
          input.dataset.key,
          input.checked,
        ])
      )

    const useOnTarget = form.querySelector<HTMLInputElement>('input[data-kind="on-target"]')?.checked ?? false

    // On Target stays its own world setting -- it is listed in System Settings too, and other parts of
    // the system read it directly -- so this dialog just writes through to it.
    await game.settings?.set(GURPS.SYSTEM_NAME, SETTING_USE_ON_TARGET, useOnTarget)
    await game.settings?.set(GURPS.SYSTEM_NAME, SETTING_COMBAT_OPTIONS, {
      maneuvers: collect('maneuver'),
      options: collect('option'),
    })
  }
}
