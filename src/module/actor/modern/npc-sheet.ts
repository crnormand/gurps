import * as Settings from '../../../lib/miscellaneous-settings.js'
import {
  ActorSheetV2Configuration,
  ActorSheetV2RenderContext,
  ActorSheetV2RenderOptions,
  DeepPartial,
  HandlebarsTemplatePart,
} from '../../types/foundry/actor-sheet-v2.js'

import { GurpsActorModernSheet, ModernSheetContext } from './sheet.js'

type RenderOptions = ActorSheetV2RenderOptions & { isFirstRender: boolean }

/* ---------------------------------------- */

interface ModernNPCSheetContext extends ModernSheetContext {
  parryblock?: string | number
  defense?: { dr: string; split?: Record<string, number> } | Record<string, unknown>
  useCI?: boolean
}

export class GurpsActorNpcModernSheet extends GurpsActorModernSheet {
  static override DEFAULT_OPTIONS: DeepPartial<ActorSheetV2Configuration> = {
    classes: ['gurps', 'sheet', 'actor', 'modern-sheet', 'ms-compact', 'ms-npc-modern-sheet'],
    position: {
      width: 650,
      height: 550,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsTemplatePart> = {
    header: {
      template: 'systems/gurps/templates/actor/modern/npc-header.hbs',
    },
    statusBar: {
      template: 'systems/gurps/templates/actor/modern/status-bar.hbs',
    },
    body: {
      template: 'systems/gurps/templates/actor/modern/npc-body.hbs',
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(options: RenderOptions): Promise<ModernSheetContext> {
    const baseContext = await super._prepareContext(options)

    const context: ModernNPCSheetContext = {
      ...baseContext,
      defense: this.actor.getTorsoDr(),
      parryblock: this.actor.getEquippedParry(),
      useCI: game.settings!.get(GURPS.SYSTEM_NAME, Settings.SETTING_USE_CONDITIONAL_INJURY as never),
    }

    return context
  }

  /* ---------------------------------------- */

  protected override async _onRender(context: ActorSheetV2RenderContext, options: RenderOptions): Promise<void> {
    const html = this.element

    const scrollContainer = html.querySelector('.ms-npc-body')
    const scrollTop = scrollContainer?.scrollTop ?? 0

    await super._onRender(context, options)

    if (scrollTop > 0) {
      const newContainer = html.querySelector('.ms-npc-body')

      if (newContainer) newContainer.scrollTop = scrollTop
    }
  }
}
