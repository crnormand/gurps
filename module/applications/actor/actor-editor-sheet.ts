import { AnyObject, DeepPartial } from 'fvtt-types/utils'
import { ActorSheetGURPS } from './actor-sheet.js'
import DocumentSheetV2 = foundry.applications.api.DocumentSheetV2
import { HitLocation, hitlocationDictionary } from '../../hitlocation/hitlocation.js'
import { Advantage, Melee, Modifier, Note, Ranged, Reaction, Skill, Spell } from '../../actor/actor-components.js'

class ActorEditorSheetGURPS extends ActorSheetGURPS {
  static override DEFAULT_OPTIONS: DocumentSheetV2.DefaultOptions = {
    position: {
      width: 880,
      height: 800,
    },
  }

  /* ---------------------------------------- */

  static override PARTS = {
    main: {
      id: 'sheet',
      template: 'systems/gurps/templates/actor/actor-sheet-gcs-editor.hbs',
      scrollable: [
        '.gurpsactorsheet',
        '#advantages',
        '#reactions',
        '#melee',
        '#ranged',
        '#skills',
        '#spells',
        '#equipmentcarried',
        '#equipmentother',
        '#notes',
      ],
    },
  }

  /* ---------------------------------------- */

  override _createEquipmentItemMenus(html: HTMLElement, includeCollapsed = true) {
    return super._createEquipmentItemMenus(html, includeCollapsed)
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: DeepPartial<DocumentSheetV2.RenderOptions> & { isFirstRender: boolean }
  ): Promise<ActorSheetGURPS.RenderContext> {
    const data = await super._prepareContext(options)
    return {
      ...data,
      isEditing: true,
    }
  }

  /* ---------------------------------------- */

  protected override async _onRender(
    _context: DeepPartial<AnyObject>,
    _options: DeepPartial<DocumentSheetV2.RenderOptions>
  ): Promise<void> {
    await super._onRender(_context, _options)
    const html = $(this.element)

    html.find('textarea').on('drop', this.dropFoundryLinks)
    html.find('input').on('drop', this.dropFoundryLinks)

    html.find('#ignoreinputbodyplan').on('click', event => this._onClickIgnoreImportBodyPlan(event))
    html.find('label[for="ignoreinputbodyplan"]').on('click', event => this._onClickIgnoreImportBodyPlan(event))

    html.find('#showflightmove').on('click', this._onClickShowFlightMove.bind(this))
    html.find('label[for="showflightmove"]').on('click', this._onClickShowFlightMove.bind(this))

    html.find('#showflightmove').on('cick', ev => {
      ev.preventDefault()
      let element = ev.currentTarget as HTMLInputElement
      let show = element.checked
      this.actor.update({ 'system.additionalresources.showflightmove': show })
    })

    this.makeDeleteMenu(this.element, '.hlmenu', new HitLocation('???'), 'click')
    this.makeDeleteMenu(this.element, '.reactmenu', new Reaction('+0', '???'), 'click')
    this.makeDeleteMenu(this.element, '.condmodmenu', new Modifier('+0', '???'), 'click')
    this.makeDeleteMenu(this.element, '.meleemenu', new Melee('???'), 'click')
    this.makeDeleteMenu(this.element, '.rangedmenu', new Ranged('???'), 'click context')
    this.makeDeleteMenu(this.element, '.adsmenu', new Advantage('???'), 'click')
    this.makeDeleteMenu(this.element, '.skillmenu', new Skill('???'), 'click')
    this.makeDeleteMenu(this.element, '.spellmenu', new Spell('???'), 'click')
    this.makeDeleteMenu(this.element, '.notemenu', new Note('???', true), 'contextmenu')

    html.find('#body-plan').on('change', async e => {
      let bodyplan = (e.currentTarget as HTMLInputElement).value
      // @ts-expect-error: awaiting types implementation
      if (bodyplan !== this.actor.system.additionalresources.bodyplan) {
        let hitlocationTable = hitlocationDictionary?.[bodyplan] as unknown as Record<string, HitLocation> | undefined
        if (!hitlocationTable) {
          ui.notifications?.error(`Unsupported bodyplan value: ${bodyplan}`)
        } else {
          // Try to copy any DR values from hit locations that match
          let hitlocations = {}
          // @ts-expect-error: awaiting types implementation
          let oldlocations = (this.actor.system.hitlocations || {}) as Record<string, HitLocation>
          let count = 0
          for (let loc in hitlocationTable) {
            let hit = hitlocationTable[loc]
            let originalLoc = Object.values(oldlocations).filter((it: HitLocation) => it.where === loc)
            // @ts-expect-error: awaiting types implementation
            let dr = originalLoc.length === 0 ? 0 : originalLoc[0]?.dr
            let it = new HitLocation(loc, dr, hit.penalty, hit.roll)
            GURPS.put(hitlocations, it, count++)
          }
          this.actor.ignoreRender = true
          await this.actor.update({
            'system.-=hitlocations': null,
            'system.additionalresources.bodyplan': bodyplan,
          })
          await this.actor.update({ 'system.hitlocations': 0 }) // A hack. The delete above doesn't always get rid of the properties, so set it to Zero
          this.actor.ignoreRender = false
          await this.actor.update({ 'system.hitlocations': hitlocations })
        }
      }
    })
  }

  /* ---------------------------------------- */

  makeDeleteMenu(html: HTMLElement, cssclass: string, obj: any, eventname = 'contextmenu') {
    new foundry.applications.ux.ContextMenu(html, cssclass, this.deleteItemMenu(obj), {
      eventName: eventname,
      jQuery: false,
    })
  }

  /* ---------------------------------------- */

  makeHeaderMenu(html: HTMLElement, cssclass: string, name: string, obj: any, path: string, eventname = 'contextmenu') {
    new foundry.applications.ux.ContextMenu(html, cssclass, [this.addItemMenu(name, obj, path)], {
      eventName: eventname,
      jQuery: false,
    })
  }

  override getMenuItems(elementid: string) {
    // returns an array of menuitems
    let menu = super.getMenuItems(elementid)

    // add any additional items to the menu
    switch (elementid) {
      case '#location':
        return [
          this.addItemMenu(
            game.i18n?.localize('GURPS.hitLocation') ?? '',
            new HitLocation('???'),
            'system.hitlocations'
          ),
          ...menu,
        ]

      case '#reactions':
        return [
          this.addItemMenu(
            game.i18n?.localize('GURPS.reaction') ?? '',
            new Reaction('+0', game.i18n?.localize('GURPS.fromEllipses') ?? ''),
            'system.reactions'
          ),
          ...menu,
        ]

      case '#conditionalmods':
        return [
          this.addItemMenu(
            game.i18n?.localize('GURPS.conditionalModifier') ?? '',
            new Modifier('+0', game.i18n?.localize('GURPS.fromEllipses')),
            'system.conditionalmods'
          ),
          ...menu,
        ]

      case '#melee':
        return [
          this.addItemMenu(
            game.i18n?.localize('GURPS.meleeAttack') ?? '',
            new Ranged(`${game.i18n?.localize('GURPS.meleeAttack')}...`),
            'system.melee'
          ),
          ...menu,
        ]

      case '#ranged':
        return [
          this.addItemMenu(
            game.i18n?.localize('GURPS.rangedAttack') ?? '',
            new Ranged(`${game.i18n?.localize('GURPS.rangedAttack')}...`),
            'system.ranged'
          ),
          ...menu,
        ]

      case '#advantages':
        return [
          this.addItemMenu(
            game.i18n?.localize('GURPS.adDisadQuirkPerk') ?? '',
            new Advantage(`${game.i18n?.localize('GURPS.adDisad')}...`),
            'system.ads'
          ),
          ...menu,
        ]

      case '#skills':
        return [
          this.addItemMenu(
            game.i18n?.localize('GURPS.skill') ?? '',
            new Skill(`${game.i18n?.localize('GURPS.skill')}...`),
            'system.skills'
          ),
          ...menu,
        ]

      case '#spells':
        return [
          this.addItemMenu(
            game.i18n?.localize('GURPS.spell') ?? '',
            new Spell(`${game.i18n?.localize('GURPS.spell')}...`),
            'system.spells'
          ),
          ...menu,
        ]

      default:
        return menu
    }
  }

  async _onClickIgnoreImportBodyPlan(ev: JQuery.ClickEvent) {
    ev.preventDefault()
    // @ts-expect-error: awaiting types implementation
    let current = this.actor.system.additionalresources.ignoreinputbodyplan
    let ignore = !current
    await this.actor.update({ 'system.additionalresources.ignoreinputbodyplan': ignore })
  }

  async _onClickShowFlightMove(ev: JQuery.ClickEvent) {
    ev.preventDefault()
    // @ts-expect-error: awaiting types implementation
    let current = this.actor.system.additionalresources.showflightmove
    let show = !current
    await this.actor.update({ 'system.additionalresources.showflightmove': show })
  }
}

export { ActorEditorSheetGURPS }
