import { GurpsActorModernSheet, countItems } from './sheet.ts'
import * as Settings from '../../../lib/miscellaneous-settings.js'
import { isPostureOrManeuver } from './utils/effect.ts'

interface NpcSheetData {
  system?: GurpsActorSystem
  effects?: ActiveEffect[]
  skillCount?: number
  traitCount?: number
  meleeCount?: number
  rangedCount?: number
  showHPTinting?: boolean
  moveMode?: GurpsMoveMode
  parryblock?: string | number
  defense?: { dr: string; split?: Record<string, number> }
  useCI?: boolean
}

export class GurpsActorNpcModernSheet extends GurpsActorModernSheet {
  static override get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['gurps', 'sheet', 'actor', 'modern-sheet', 'ms-compact', 'ms-npc-modern-sheet'],
      width: 650,
      height: 550,
      tabs: [],
      scrollY: ['.ms-npc-body'],
    })
  }

  // @ts-expect-error - Template returns NPC sheet path which differs from parent
  override get template() {
    if (!game.user!.isGM && this.actor.limited) return 'systems/gurps/templates/actor/actor-sheet-gcs-limited.hbs'
    return 'systems/gurps/templates/actor/actor-npc-modern-sheet.hbs'
  }

  override getData(): NpcSheetData {
    const sheetData = super.getData() as NpcSheetData

    sheetData.effects = sheetData.effects?.filter(effect => !isPostureOrManeuver(effect))

    sheetData.skillCount = countItems(sheetData.system?.skills)
    sheetData.traitCount = countItems(sheetData.system?.ads)
    sheetData.meleeCount = countItems(sheetData.system?.melee)
    sheetData.rangedCount = countItems(sheetData.system?.ranged)
    sheetData.showHPTinting = game.settings!.get(Settings.SYSTEM_NAME, Settings.SETTING_PORTRAIT_HP_TINTING)
    sheetData.moveMode = this.actor.getCurrentMoveMode()

    sheetData.defense = this.actor.getTorsoDr()
    sheetData.parryblock = this.actor.getEquippedParry()
    sheetData.useCI = game.settings!.get(Settings.SYSTEM_NAME, Settings.SETTING_USE_CONDITIONAL_INJURY as never)

    return sheetData
  }

  override async _render(force?: boolean, options?: Application.RenderOptions): Promise<void> {
    const scrollContainer = this.element?.find('.ms-npc-body')[0]
    const scrollTop = scrollContainer?.scrollTop ?? 0
    await super._render(force, options)
    if (scrollTop > 0) {
      const newContainer = this.element?.find('.ms-npc-body')[0]
      if (newContainer) newContainer.scrollTop = scrollTop
    }
  }
}
